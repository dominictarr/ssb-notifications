var ref = require('ssb-ref')
var Reduce = require('flumeview-reduce')
var isFeed = ref.isFeed

function isFunction (f) {
  return 'function' === typeof f
}

function isString(s) {
  return 'string' === typeof s
}

exports.name = 'notifications'
exports.version = require('./package.json').version
exports.manifest = {
  get: 'async'
}

function toTarget(s) {
  return isString(s) ? s : !s ? null : s.link
}

function isChannel (s) {
  return isString(s) && '#' === s[0]
}

function toMentions(a) {
  return map(a, isFeed)
}

//DEV: filter out things older than 3 months.
var THREE_MONTHS = 1000*60*60*24*90
function isRecent (ts) {
  return true
//  if(!isNaN(+ts) && ts > 0)
//    return ts > Date.now() - THREE_MONTHS
}

//function map (a, test) {
//  if(!a) return []
//  if('string' == typeof a && test(a)) return [a]
//  if(Array.isArray(a)) return a.map(toTarget).filter(test)
//  return []
//}

function map (a, fn) {
  return !Array.isArray(a) ? [fn(a)] : a.map(fn)
}

function mapObject (o, fn) {
  var _o = {}
  for(var k in o)
    _o[k] = fn(k, o[k])
  return _o
}

function toChannel (c) {
  if(!isString(c)) return
  if(c[0] === '#') return c
  else return '#'+c
}

/*
  currently, this is coupled to several notification types.
*/

exports.init = function (sbot, config) {
  var notifications = {}
  var index =
  sbot._flumeUse('notifications', Reduce(10, function (state, data, seq) {
    if(!state) state = {}

    function subscribe (subscriber, key, seq) {
      state[key] = state[key] || {}
      state[key]._seq = seq //monotonic
      state[key][subscriber] = seq
    }

    function subscribeOther(subscriber, key, seq) {
      if(!subscriber) throw new Error('subscriber must be provided')
      state[key] = state[key] || {}
      state[key][subscriber] = state[key][subscriber] || -seq
      if(!isFeed(subscriber)) {
        state[subscriber] = state[subscriber] || {}
        state[subscriber]._seq = seq
        state[subscriber]._meta = true
      }
    }

    var msg = data.value, key = data.key

    if(msg.content.text) {
      var root = msg.content.root
      if(root) {
        //when you post, subscribe, but mark this as acknowledged.
        subscribe(msg.author, root, data.timestamp)
      }
      else {
        //subscribe the OP
        subscribe(msg.author, key, data.timestamp)
      }
      if(isString(msg.content.channel)) {
        subscribeOther(toChannel(msg.content.channel), key, data.timestamp)
      }
      map(msg.content.mentions, toTarget).forEach(function (mention) {
        if(isFeed(mention) || isChannel(mention))
          subscribeOther(mention, key, data.timestamp)
      })
    }
    else if(msg.content.type === 'channel' && isString(msg.content.channel)) {
      subscribe(msg.author, toChannel(msg.content.channel), data.timestamp)
    }

    //apply to any cached notifications.
    for(var k in state[key])
      if(notifications[k] && state[key][k]) {
        if(notifications[k][key] == state[key]._seq)
          delete notifications[k][key] //this thread has been acknowledged.
        else
          notifications[k][key] = state[key]._seq
      }

    return state
  }))

  var _get = index.get
  function get (opts, cb) {
    if(isFunction(opts)) cb = opts, opts = {}

    _get(function (err, state) {
      state = state || {}
      var source = opts.source
      console.log('STATE', state)
      if(source) {
        var o = {}
        for(var k in state) {
          if(null != state[k][source] && state[k]._seq > state[k][source]) {
            if(state[k]._meta) {
              var p = o[k] = {}
              for(var j in state) {
                if(!o[j] &&
                  null != state[j][k] && //channel k is subscribed to j
                  state[j]._seq != state[k][source]
                )
                  p[j] = state[j]._seq //latest activity on thread
              }
            } else {
              o[k] = state[k]._seq
            }
          }
        }

        return cb(null, o)
      }
      else
        cb(null, state)
    })
  }

  index.get = get

  return index
}



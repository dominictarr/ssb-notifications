var ref = require('ssb-ref')
var Reduce = require('flumeview-reduce')
var isFeed = ref.isFeed

function isFunction (f) {
  return 'function' === typeof f
}

exports.name = 'notifications'
exports.version = require('./package.json').version
exports.manifest = {
  get: 'async'
}

function toTarget(s) {
  return 'string' === typeof s ? s : s.link
}

function isChannel (s) {
  return 'string' == typeof s && '#' === s[0]
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

function map (a, test) {
  if(!a) return []
  if('string' == typeof a && test(a)) return [a]
  if(Array.isArray(a)) return a.map(toTarget).filter(test)
  return []
}

function mapObject (o, fn) {
  var _o = {}
  for(var k in o)
    _o[k] = fn(k, o[k])
  return _o
}

/*
  currently, this is coupled to several notification types.
*/

exports.init = function (sbot, config) {
  var index =
  sbot._flumeUse('notifications', Reduce(9, function (state, data) {
    if(!state)
      state = {
        subscriptions: {}, notifications: {}
      }

    var msg = data.value, key = data.key

    function notify(user, id, value) {
      if(!isRecent(value)) return
      //unless they have explicitly left the room
      if(!state.subscriptions[id] || state.subscriptions[id][user] !== false) {
        state.notifications[user] = state.notifications[user] || {}
        state.notifications[user][id] = state.notifications[user][id] ? Math.max(state.notifications[user][id], value) : value
      }
    }

    //timeless is for if we want to always process the subscription.
    //as with channel subscriptions.

    //subcribe theads -> user
    //         channel -> user
    function subscribe (user, id, value, timeless) {
      if(value != null) {
        if(!isRecent(value) && !timeless) return
        state.subscriptions[id] = state.subscriptions[id] || {}
        state.subscriptions[id][user] = Math.min(value, state.subscriptions[id][user] || Infinity)
      }
      else if (state.subscriptions[id])
        delete state.subscriptions[id][user]
    }

    if(msg.content.text) {
      var root = msg.content.root
      if(root) {

        var mentions = toMentions(msg.content.mentions)

        if(mentions.length) {
          mentions.forEach(function (mention) {
            notify(mention, root, msg.timestamp)
          })
        } else {
          //notify all who posted in this thead
          for(var author in state.subscriptions[root]) {
            notify(author, root, msg.timestamp)
          }
          if(msg.content.channel)
            notify(msg.content.channel, root, msg.timestamp)
          else if(msg.content.mentions) {
            map(msg.content.mentions, isChannel).forEach(function (link) {
              notify(link, root, msg.timestamp)
            })
            /* // notify backlinks?
            map(msg.content.mentions, isMsg).forEach(function (e) {
              notify(e, root, msg.timestamp)
            })
            */
          }
        }

        //remove the author of this message, though, unless there is another notifying trigger
        if(state.notifications[msg.author] < msg.timestamp)
          notify(msg.author, root, null)

        subscribe(msg.author, root, msg.content.unsubscribe === false ? null : msg.timestamp)
      }
      else {
        subscribe(msg.author, key, msg.content.unsubscribe === false ? null : msg.timestamp)
        //if this is a channel, then notify it.
        if(msg.content.channel)
          notify('#'+msg.content.channel, root, msg.timestamp)
      }
    }
    //channel subscriptions
    else if(msg.content.type === 'channel')
      subscribe(msg.author, '#'+msg.content.channel, msg.content.subscribed === true ? msg.timestamp : null, true)

    return state

  }))

  var _get = index.get
  function get (opts, cb) {
    if(isFunction(opts)) cb = opts, opts = {}

    _get(function (err, state) {
      state = state || {}
      //get notifications for this subscriber
      if(opts.subscriber) {
        cb(null, mapObject(state.notifications[opts.subscriber], function (key) {
          if(state.notifications[key])
            return state.notifications[key]
          else return state.notifications[opts.subscriber][key]
        }))
      }
      //get subscriptions for this notifier
      else if(opts.notifier) {
        cb(null, mapObject(state.subscriptions[opts.notifier], function (key) {
          if(state.subscriptions[key])
            return state.subscriptions[key]
          else return state.subscriptions[opts.notifier][key]
        }))
      }
      else
        cb(null, state)
    })
  }

  index.get = get

  return index
}


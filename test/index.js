var tape = require('tape')
var cont = require('cont')

var Sbot = require('scuttlebot')
  .use(require('../'))

var sbot = Sbot({
  temp: 'test-notifications'
})
var alice = sbot.createFeed()
var bob = sbot.createFeed()
var root
tape('op is subscribed', function (t) {
  alice.add({
    type: 'post', text: 'hello thread'
  }) (function (err, data) {
    root = data
    sbot.notifications.get(function (err, value) {
      t.ok(value[data.key])
      t.equal(value[data.key][alice.id], data.timestamp)
      t.end()
    })
  })
})

tape('reply', function (t) {
  bob.add({
    type: 'post', text: 'welcome',
    root: root.key, branch: root.key
  }) (function (err, data) {
    sbot.notifications.get(function (err, value) {
      console.log('value', value)
      t.ok(value[root.key])
      t.equal(value[root.key]._seq, data.timestamp)
      t.equal(value[root.key][alice.id], root.timestamp)
      t.equal(value[root.key][bob.id], data.timestamp,)
      t.end()
    })
  })
})

tape('channel', function (t) {
  bob.add({
    type:'channel', subscribe: true, channel: 'test'
  }) (function (err, data) {
    sbot.notifications.get(function (err, value) {
      console.log(value)
      t.equal(value['#test'][bob.id], data.timestamp)
      t.equal(value['#test']._seq, data.timestamp)
      alice.add({
        type: 'post', text: 'test 1 2', channel: 'test'
      })(function (err, data) {
        var _data = data
        if(err) throw err
        sbot.notifications.get(function (err, value) {
          t.equal(value['#test']._seq, data.timestamp, 'channel updated')
          console.log("CHANNELS", value, bob.id)
          sbot.notifications.get({source: bob.id}, function (err, value) {
            console.log('VALUE', value)
            var test_data = {}
            test_data[data.key] = data.timestamp
            t.deepEqual(value, {'#test': test_data})
            console.log('_data', _data)
            t.end()
//            sbot.notifications.get({source: '#test'}, function (err, value) {
//              console.log("TEST", value)
//              t.end()
//            })
          })
        })
      })
    })
  })
})

tape('close', function (t) {
  sbot.close()
  t.end()
})


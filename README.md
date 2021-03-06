# ssb-notifications

## notifications experiment

I wanted to experiment with more sophisticated notifications systems,
mainly for the sake of _solarpunk economics_.

## basic notification logic

if you create a thread or post in it, you are auto-subscribed to that thread.

if you mention anyone in a post, they are notified (but not other subscribers)

otherwise, all subscribers to that thread are notified.

If you post a message with `subscribe=false` any subscription is removed.
you can set subscribe=false on any message in the thread, including the root post.
where possible, it's best not to make a separate message for unsubscribe.

## ideas

### unsubscribe with extreme prejudice

unsubscribe and never be notified about this again ever, not even if mentioned.
if unsubscribe is 'leave the room' this is 'burn down the building'

### close the thread

unsubscribe everyone else too.

## data structure

``` js
{
  subscriptions: {
    <thread>: { <user|channel>: <timestamp>, ... },
    <channel>: { <user>: <timestamp>, ... }
  },
  notifications: {
    <user|channel>: { <thread>: <timestamp>, ... }

  }
}
```

## alternate data structure

a minimal permanent record of subscriptions, optimized to update easily.
``` js
{
  <Notifier: thread|channel>: {
    $seq: <max_seq>
    <Subscriber: user|channel>: <seq>,
  },
  ...
}
```
the `Notifier.$seq` is the latest update in that thread. If the `Notifier.Subscriber` is equal,
that means they are up to date with that thread.

To collect notifications, on a user query, iterate over all
subscriptions for ones pertaining to that user. But cache this
user in memory after that, so that updates are fast/instant.

normal notifiers are just threads, they are only
updated when there is a new message in that thread.
but some notifiers are themselves subscribed to notifiers in turn.

remaining thing to figure out: there are numbers for notifications.
They currently show the (received) timestamp of the latest interaction.
if someone else subscribes you, the timestamp should be ts-1,
because that message is also a notification. if you subscribe yourself
you are now consistent with that.

you can also subscribe to a group/tag/channel. If you do that,
when you request your notifications, it returns it as
`{<thread>:<ts>,<channel>: {<thread>: <ts>}}` where ts is the latest
activity time if greater than your last interaction in that thread.



## License

MIT



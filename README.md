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

## License

MIT




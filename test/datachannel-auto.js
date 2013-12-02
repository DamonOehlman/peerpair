var test = require('tape');
var peerpair = require('..');
var peers;
var dcs;

test('can create a new peer pair', function(t) {
  t.plan(1);

  // NOTE: in chrome pre 31 RtpDataChannels will need to be specified
  peers = peerpair();
  t.equal(peers.length, 2);
});

test('can connect with dcs', function(t) {
  t.plan(4);

  peers.createChannelsAndConnect(['test'], function(err, channels) {
    t.ifError(err);
    dcs = channels;
    t.equal(dcs.length, 2);

    dcs.forEach(function(dc) {
      t.equal(dc.label, 'test', 'dc created with the correct label');
    });
  });
});

test('can send messages across the datachannel', function(t) {
  t.plan(3);

  setTimeout(function() {
    dcs[0].onmessage = function(evt) {
      t.equal(evt.data, 'ho');
    };

    dcs[1].onmessage = function(evt) {
      t.equal(evt.data, 'hi');
      dcs[1].send('ho');
    };

    dcs[0].send('hi');
    t.pass('sent message');
  }, 50);
});
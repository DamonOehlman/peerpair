var test = require('tape');
var peerpair = require('..');
var peers;
var dcs = [];

require('cog/logger').enable('*');

test('can create a new peer pair', function(t) {
  t.plan(1);

  // NOTE: in chrome pre 31 RtpDataChannels will need to be specified
  peers = peerpair();
  t.equal(peers.length, 2);
});

test('peers are created', function(t) {
  t.plan(2);
  t.equal(peers[0].iceConnectionState, 'new');
  t.equal(peers[1].iceConnectionState, 'new');
});

test('can create a datachanne', function(t) {
  t.plan(2);
  t.ok(dcs[0] = peers[0].createDataChannel('test'));
  t.equal(dcs[0].label, 'test');
});

test('can connect the peers', function(t) {
  t.plan(5);

  peers.events.once('connected', function() {
    t.ok(
      peers[0].iceConnectionState === 'connected' ||
      peers[0].iceConnectionState === 'completed',
      'connected'
    );

    t.ok(
      peers[1].iceConnectionState === 'connected' ||
      peers[1].iceConnectionState === 'completed',
      'connected'
    );
  });

  peers[1].ondatachannel = function(evt) {
    dcs[1] = evt.channel;
    t.equal(dcs[1].label, 'test');

    dcs[1].onopen = function() {
      t.pass('dc:1 open');
      dcs[1].onopen = null;
    };
  }

  // should get an onopen event for each of the channels
  dcs[0].onopen = function() {
    t.pass('dc:0 open');
    dcs[0].onopen = null;
  };

  peers.connect();
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
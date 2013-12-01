var test = require('tape');
var peerpair = require('..');
var peers;

require('cog/logger').enable('*');

test('can create a new peer pair', function(t) {
  t.plan(1);
  peers = peerpair();
  t.equal(peers.length, 2);
});

test('peers are connected', function(t) {
  t.plan(2);
  t.equal(peers[0].iceConnectionState, 'new');
  t.equal(peers[1].iceConnectionState, 'new');
});

test('can connect the peers', function(t) {
  t.plan(2);
  peers.events.once('connected', function() {
    t.equal(peers[0].iceConnectionState, 'connected');
    t.equal(peers[1].iceConnectionState, 'connected');
  });

  peers.connect();
});
/* jshint node: true */
'use strict';

var defaults = require('cog/defaults');
var detect = require('rtc-core/detect');

/**
  # peerpair

  The `peerpair` module is used to create two connected WebRTC
  `RTCPeerConnection` objects on the local machine.  It's also useful to
  provide people as a tongue twister where then pretty much end up saying
  'pee pee' repeatedly.

  ## Why?

  This module will save you a lot of time if you are writing modules
  that interface with the core WebRTC objects, and expect a connection
  to be active between two connections to test behaviour.

  ## Example Usage

**/
module.exports = function(opts) {
  var config = defaults({}, (opts || {}).config, {
    iceServers: []
  });
  var peers;
  var RTCPeerConnection = (opts || {}).RTCPeerConnection ||
    detect('RTCPeerConnection');


  // create the peers
  peers = [
    new RTCPeerConnection(config, (opts || {}).constraints),
    new RTCPeerConnection(config, (opts || {}).constraints)
  ];

  // patch the simple connect method
  peers.connect = function(callback) {
  };

  return peers;
};
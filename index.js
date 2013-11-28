/* jshint node: true */
'use strict';

var detect = require('rtc-core/detect');

/**
  # peerpair

  The `peerpair` module is used to create two connected WebRTC
  `RTCPeerConnection` objects on the local machine.

  ## Why?

  This module will save you a lot of time if you are writing modules
  that interface with the core WebRTC objects, and expect a connection
  to be active between two connections to test behaviour.

  ## Example Usage

**/
module.exports = function(opts) {
  var RTCPeerConnection = (opts || {}).RTCPeerConnection ||
    detect('RTCPeerConnection');

  console.log(RTCPeerConnection);
};
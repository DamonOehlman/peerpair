/* jshint node: true */
'use strict';

var debug = require('cog/logger')('peerpair');
var defaults = require('cog/defaults');
var detect = require('rtc-core/detect');
var EventEmitter = require('events').EventEmitter;

var defaultConfig = {
  iceServers: []
};

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
  var config = defaults({}, (opts || {}).config, defaultConfig);
  var events = new EventEmitter();
  var peers;

  var RTCPeerConnection = (opts || {}).RTCPeerConnection ||
    detect('RTCPeerConnection');
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  function checkConnected() {
    var connected = peers.filter(function(peer) {
      return peer.iceConnectionState === 'connected';
    });

    if (connected.length === 2) {
      events.emit('connected');
    }
  }

  function createAnswer(source, target) {
    return function() {
      debug('setting remote description of target connection');

      // first update the remote description to match the local dsecription
      // of the target
      source.setRemoteDescription(
        new RTCSessionDescription(target.localDescription),
        function() {
          debug('setRemoteDescription ok, creating answer');

          source.createAnswer(
            function(desc) {
              debug('createAnswer ok, setting remote description of source');

              source.setLocalDescription(
                desc,
                function() {
                  target.setRemoteDescription(
                    new RTCSessionDescription(desc),
                    function() {
                      debug('handshake ok, signalling state = ' + source.signalingState);
                    },
                    reportError
                  );
                },

                reportError
              );
            },
            reportError
          );
        },
        reportError
      );
    };
  }

  function createOffer(source, target) {
    return function() {
      debug('creating offer');
      source.createOffer(
        function(desc) {
          debug('createOffer ok, setting local description');
          source.setLocalDescription(
            desc,
            createAnswer(target, source),
            reportError
          );
        },
        reportError
      );
    };
  }

  function connect() {
    createOffer(peers[0], peers[1])();
  }

  function handleIceCandidate(source, target) {
    var queued = [];

    return function(evt) {
      if (evt.candidate) {
        debug('captured ice candidate');
        queued.push(evt.candidate);
      }

      if (source.iceGatheringState === 'complete') {
        debug('ice gathering state complete for source, sending candidates to target');
        queued.splice(0).forEach(function(candidate) {
          target.addIceCandidate(candidate);
        });
      }
    };
  }

  function reportError(err) {
    debug('error: ', err);
    // events.emit('error', err);
  }

  // create the peers
  peers = [
    new RTCPeerConnection(config, (opts || {}).constraints),
    new RTCPeerConnection(config, (opts || {}).constraints)
  ];

  // monitor each of the peer connections for the connected state
  peers[0].oniceconnectionstatechange = checkConnected;
  peers[1].oniceconnectionstatechange = checkConnected;

  // when negotiation is needed run the create offer logic
  peers[0].onnegotiationneeded = createOffer(peers[0], peers[1]);
  peers[1].onnegotiationneeded = createOffer(peers[1], peers[0]);

  // candidate gathering
  peers[0].onicecandidate = handleIceCandidate(peers[0], peers[1]);
  peers[1].onicecandidate = handleIceCandidate(peers[1], peers[0]);

  // expose the events emitter
  peers.events = events;

  // patch the simple connect method
  peers.connect = connect;

  return peers;
};
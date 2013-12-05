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
  `RTCPeerConnection` objects on the local machine.

  ## Why?

  This module will save you a lot of time if you are writing modules
  that interface with the core WebRTC objects, and expect a connection
  to be active between two connections to test behaviour.

  ## Example Usage

**/
module.exports = function(peers, opts) {
  var config = defaults({}, (opts || {}).config, defaultConfig);
  var events = new EventEmitter();

  var RTCPeerConnection = (opts || {}).RTCPeerConnection ||
    detect('RTCPeerConnection');
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  // if we have not been provided peers
  if (! Array.isArray(peers)) {
    opts = peers;
    peers = [];
  }

  // work with a copy
  peers = [].concat(peers);

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

  function createChannelsAndConnect() {
    var args = [].slice.call(arguments);
    var dcs;
    var callback = args[args.length - 1];
    var newChannels = [];

    function pairChannels() {
      dcs.forEach(function(pair) {
        // match the dc pair
        pair[1] = newChannels.filter(function(dc) {
          return dc.label === pair[0].label;
        })[0];
      });

      checkChannelsConnected();
    }

    function checkChannelsConnected() {
      var allConnected = true;
      var waitForOpen;

      dcs.forEach(function(pair) {
        pair.forEach(function(dc) {
          console.log(dc.readyState);
          if (dc.readyState !== 'open') {
            allConnected = false;

            if (! waitForOpen) {
              dc.onopen = waitForOpen = function() {
                dc.onopen = null;
                checkChannelsConnected();
              }
            }
          }
        });
      });

      if (allConnected && callback) {
        callback.apply(this, [null].concat(dcs));
      }
    }

    // if we have been provided a callback, then use it
    if (typeof callback == 'function') {
      args = args.slice(0, -1);
    }
    // otherwise, unset the callback
    else {
      callback = undefined;
    }

    // create the peer 0 partner for the data channels
    dcs = args.map(function(name) {
      return [peers[0].createDataChannel(name)];
    });

    // capture new channels
    peers[1].ondatachannel = function(evt) {
      newChannels.push(evt.channel);
      if (newChannels.length === dcs.length) {
        peers[1].ondatachannel = null;
        pairChannels();
      }
    };

    // connect the peers
    peers.connect();
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

  // once connected, lets watch for renegotiation requirements
  events.once('connected', function() {
    peers[0].onnegotiationneeded = createOffer(peers[0], peers[1]);
    peers[1].onnegotiationneeded = createOffer(peers[1], peers[0]);
  });

  // candidate gathering
  peers[0].onicecandidate = handleIceCandidate(peers[0], peers[1]);
  peers[1].onicecandidate = handleIceCandidate(peers[1], peers[0]);

  // expose the events emitter
  peers.events = events;

  // patch the simple connect method
  peers.connect = connect;

  // patch the create channels and connect method
  peers.createChannelsAndConnect = createChannelsAndConnect;

  return peers;
};
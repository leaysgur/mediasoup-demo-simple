/**
 * IMPORTANT:
 *
 * This is not the "configuration file" of mediasoup. This is the configuration
 * file of the mediasoup-demo app. mediasoup itself is a server-side library, It
 * does not read any "configuration file". Instead it exposes an API. This demo
 * application just reads settings from this file and calls the mediasoup API with
 * them when appropriate.
 */

module.exports = {
  mediasoup: {
    // mediasoup WebRtcTransport settings.
    webRtcTransport: {
      listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
      maxIncomingBitrate: 1500000
    }
  }
};

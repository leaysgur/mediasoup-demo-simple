const { EventEmitter } = require("events");

class ConfRoom extends EventEmitter {
  constructor({ protooRoom, mediasoupRouter }) {
    super();
    this.setMaxListeners(Infinity);

    this._closed = false;
    this._protooRoom = protooRoom;
    this._mediasoupRouter = mediasoupRouter;
  }

  close() {
    console.log("close()");

    this._closed = true;
    this._protooRoom.close();
    this._mediasoupRouter.close();
    this.emit("close");
  }

  getStatus() {
    return {
      peerLen: this._protooRoom.peers.length,
      transportLen: this._mediasoupRouter._transports.size
    };
  }

  handlePeerConnect({ peerId, protooWebSocketTransport }) {
    const existingPeer = this._protooRoom.getPeer(peerId);

    if (existingPeer) {
      console.log(
        "handleProtooConnection() | there is already a protoo Peer with same peerId, closing it [peerId:%s]",
        peerId
      );

      existingPeer.close();
    }

    let peer;

    try {
      peer = this._protooRoom.createPeer(peerId, protooWebSocketTransport);
    } catch (error) {
      console.error("protooRoom.createPeer() failed:%o", error);
    }

    // Have mediasoup related maps ready even before the Peer joins since we
    // allow creating Transports before joining.
    peer.data.transports = new Map();
    peer.data.producers = new Map();
    peer.data.consumers = new Map();

    peer.on("request", (request, accept, reject) => {
      console.log(
        'protoo Peer "request" event [method:%s, peerId:%s]',
        request.method,
        peer.id
      );

      this._handleProtooRequest(peer, request, accept, reject).catch(error => {
        console.error("request failed:%o", error);
        reject(error);
      });
    });

    peer.on("close", () => {
      if (this._closed) return;
      console.log('protoo Peer "close" event [peerId:%s]', peer.id);

      // If the Peer was joined, notify all Peers.
      if (peer.data.joined) {
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          otherPeer.notify("peerClosed", { peerId: peer.id }).catch(() => {});
        }
      }

      // Iterate and close all mediasoup Transport associated to this Peer, so all
      // its Producers and Consumers will also be closed.
      for (const transport of peer.data.transports.values()) {
        transport.close();
      }

      if (this._protooRoom.peers.length === 0) {
        console.log("last Peer in the room left, closing the room");
        this.close();
      }
    });
  }

  async _handleProtooRequest(peer, request, accept, reject) {
    switch (request.method) {
      case "getRouterRtpCapabilities": {
        accept(this._mediasoupRouter.rtpCapabilities);
        break;
      }

      case "join": {
        if (peer.data.joined) throw new Error("Peer already joined");

        const { device, rtpCapabilities } = request.data;

        if (typeof rtpCapabilities !== "object")
          throw new TypeError("missing rtpCapabilities");

        // Store client data into the protoo Peer data object.
        peer.data.device = device;
        peer.data.rtpCapabilities = rtpCapabilities;

        // Tell the new Peer about already joined Peers.
        // And also create Consumers for existing Producers.
        const peers = [];
        for (const otherPeer of this._getJoinedPeers()) {
          peers.push({
            id: otherPeer.id,
            device: otherPeer.data.device
          });

          for (const producer of otherPeer.data.producers.values()) {
            this._createConsumer({
              consumerPeer: peer,
              producerPeer: otherPeer,
              producer
            });
          }
        }

        accept({ peers });

        // Mark the new Peer as joined.
        peer.data.joined = true;

        // Notify the new Peer to all other Peers.
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          otherPeer
            .notify("newPeer", {
              id: peer.id,
              device: peer.data.device
            })
            .catch(() => {});
        }

        break;
      }

      case "createWebRtcTransport": {
        const { producing, consuming } = request.data;

        const transport = await this._mediasoupRouter.createWebRtcTransport({
          listenIps: [{ ip: "127.0.0.1" }],
          appData: { producing, consuming }
        });

        // Store the WebRtcTransport into the protoo Peer data Object.
        peer.data.transports.set(transport.id, transport);

        accept({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });

        break;
      }

      case "connectWebRtcTransport": {
        const { transportId, dtlsParameters } = request.data;
        const transport = peer.data.transports.get(transportId);

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        await transport.connect({ dtlsParameters });
        accept();

        break;
      }

      case "produce": {
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { transportId, kind, rtpParameters } = request.data;
        let { appData } = request.data;
        const transport = peer.data.transports.get(transportId);

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        // Add peerId into appData to later get the associated Peer.
        appData = Object.assign({ peerId: peer.id }, appData);

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData
        });

        // Store the Producer into the protoo Peer data Object.
        peer.data.producers.set(producer.id, producer);

        accept({ id: producer.id });

        // Optimization: Create a server-side Consumer for each Peer.
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          this._createConsumer({
            consumerPeer: otherPeer,
            producerPeer: peer,
            producer
          });
        }

        break;
      }

      case "closeProducer": {
        // Ensure the Peer is joined.
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { producerId } = request.data;
        const producer = peer.data.producers.get(producerId);

        if (!producer)
          throw new Error(`producer with id "${producerId}" not found`);

        producer.close();

        peer.data.producers.delete(producer.id);
        accept();

        break;
      }

      default: {
        console.log('unknown request.method "%s"', request.method);
        reject(500, `unknown request.method "${request.method}"`);
      }
    }
  }

  _getJoinedPeers({ excludePeer = undefined } = {}) {
    return this._protooRoom.peers.filter(
      peer => peer.data.joined && peer !== excludePeer
    );
  }

  async _createConsumer({ consumerPeer, producerPeer, producer }) {
    // Optimization:
    // - Create the server-side Consumer. If video, do it paused.
    // - Tell its Peer about it and wait for its response.
    // - Upon receipt of the response, resume the server-side Consumer.
    // - If video, this will mean a single key frame requested by the
    //   server-side Consumer (when resuming it).

    // NOTE: Don't create the Consumer if the remote Peer cannot consume it.
    if (
      !this._mediasoupRouter.canConsume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities
      })
    ) {
      console.log("_createConsumer() | can not consume!");
      return;
    }

    const transport = Array.from(consumerPeer.data.transports.values()).find(
      t => t.appData.consuming
    );

    if (!transport) {
      console.log(
        "_createConsumer() | WebRtcTransport for consuming not found"
      );

      return;
    }

    let consumer;
    try {
      consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities,
        // consume with paused to avoid from missing keyframe
        paused: producer.kind === "video"
      });
    } catch (error) {
      console.log("_createConsumer() | transport.consume():%o", error);
      return;
    }

    consumerPeer.data.consumers.set(consumer.id, consumer);

    // Set Consumer events.
    consumer.on("transportclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
      consumerPeer
        .notify("consumerClosed", { consumerId: consumer.id })
        .catch(() => {});
    });

    // Send a protoo request to the remote Peer with Consumer parameters.
    try {
      await consumerPeer.request("newConsumer", {
        peerId: producerPeer.id,
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        appData: producer.appData,
        producerPaused: consumer.producerPaused
      });

      // Resume it when accepted
      if (producer.kind === "video") await consumer.resume();
    } catch (error) {
      console.log("_createConsumer() | failed:%o", error);
    }
  }
}

module.exports = ConfRoom;

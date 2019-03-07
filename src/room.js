import { EventEmitter } from 'events';
import { Device } from 'mediasoup-client';
import { WebSocketTransport, Peer } from 'protoo-client';
import { generateRandomId } from './utils';

export default class Room extends EventEmitter {
  constructor() {
    console.warn('room.constructor()');
    super();

    this.id = 'p:' + generateRandomId(6);
    this.peer = null;
    this.sendTransport = null;
    this.recvTransport = null;
  }

  join(roomId) {
    console.warn('room.join()');
    const wsTransport = new WebSocketTransport(
      `ws://localhost:4443/?roomId=r:${roomId}&peerId=${this.id}`,
    );

    this.peer = new Peer(wsTransport);
    this.peer.on('open', this.onPeerOpen.bind(this));
    this.peer.on('request', this.onPeerRequest.bind(this));
    this.peer.on('notification', this.onPeerNotification.bind(this));
    this.peer.on('failed', console.error);
    this.peer.on('disconnected', console.error);
    this.peer.on('close', console.error);
  }

  async sendAudio(track) {
    console.warn('room.sendAudio()');
    const audioProducer = await this.sendTransport.produce({
      track,
    });
    audioProducer.on('transportclose', console.error);
    audioProducer.on('trackended', console.error);

    return audioProducer;
  }
  async sendVideo(track) {
    console.warn('room.sendVideo()');
    const videoProducer = await this.sendTransport.produce({
      track,
    });
    videoProducer.on('transportclose', console.error);
    videoProducer.on('trackended', console.error);

    return videoProducer;
  }

  close() {
    console.warn('room.close()');
  }

  async onPeerOpen() {
    console.warn('room.peer:open');
    const device = new Device();

    const routerRtpCapabilities = await this.peer
      .request('getRouterRtpCapabilities')
      .catch(console.error);
    await device.load({ routerRtpCapabilities });

    await this._prepareSendTransport(device).catch(console.error);
    await this._prepareRecvTransport(device).catch(console.error);

    const res = await this.peer.request('join', {
      device,
      rtpCapabilities: device.rtpCapabilities
    });

    this.emit('@open', res);
  }

  async _prepareSendTransport(device) {
    const transportInfo = await this.peer
      .request('createWebRtcTransport', {
        producing: true,
        consuming: false,
      })
      .catch(console.error);

    // transportInfo.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.sendTransport = device.createSendTransport(transportInfo);
    this.sendTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      console.warn('room.sendTransport:connect');
      this.peer
        .request('connectWebRtcTransport', {
          transportId: this.sendTransport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });
    this.sendTransport.on(
      'produce',
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        console.warn('room.sendTransport:produce');
        try {
          const { id } = await this.peer.request('produce', {
            transportId: this.sendTransport.id,
            kind,
            rtpParameters,
            appData
          });

          callback({ id });
        } catch (error) {
          errback(error);
        }
      }
    );
  }

  async _prepareRecvTransport(device) {
    const transportInfo = await this.peer
      .request('createWebRtcTransport', {
        producing: false,
        consuming: true,
      })
      .catch(console.error);

    // transportInfo.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.recvTransport = device.createRecvTransport(transportInfo);
    this.recvTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      console.warn('room.recvTransport:connect');
      this.peer
        .request('connectWebRtcTransport', {
          transportId: this.recvTransport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });
  }

  onPeerRequest(req, resolve) {
    console.warn('room.peer:request', req.method);
    switch (req.method) {
      case 'newConsumer': {
        this.recvTransport.consume(req.data).then(consumer => {
          resolve();
          this.emit('@consumer', consumer);
          consumer.on('transportclose', console.error);
        }).catch(console.error);
        break;
      }
      default:
        resolve();
    }
  }

  onPeerNotification(notification) {
    switch (notification.method) {
      case 'activeSpeaker':
      case 'producerScore':
      case 'consumerScore':
        break;
      case 'newPeer':
      case 'peerClosed':
      default:
        console.warn('room.peer:notification', notification);
    }
  }
}

import { EventEmitter } from 'events';
import { Device } from 'mediasoup-client';
import { WebSocketTransport, Peer } from 'protoo-client';
import { generateRandomId } from './utils';

export default class Room extends EventEmitter {
  constructor() {
    super();

    this.id = 'p:' + generateRandomId(6);
    this.peer = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.audioProducer = null;
    this.videoProducer = null;
  }

  join(roomId) {
    const wsTransport = new WebSocketTransport(
      `ws://localhost:4443/?roomId=r:${roomId}&peerId=${this.id}`,
    );

    this.peer = new Peer(wsTransport);
    this.peer.on('open', this.onPeerOpen.bind(this));
    this.peer.on('request', this.onPeerRequest);
    this.peer.on('notification', this.onPeerNotification);
    this.peer.on('failed', console.error);
    this.peer.on('disconnected', console.error);
    this.peer.on('close', console.error);
  }

  async sendAudio(track) {
    this.audioProducer = await this.sendTransport.produce({
      track,
    });
  }

  close() {
    console.warn('TODO: close');
  }

  async onPeerOpen() {
    console.warn('open');
    const device = new Device();

    const routerRtpCapabilities = await this.peer
      .request('getRouterRtpCapabilities')
      .catch(console.error);
    device.load({ routerRtpCapabilities });

    await this._prepareSendTransport(device).catch(console.error);
    await this._prepareRecvTransport(device).catch(console.error);

    const { peers } = await this.peer.request('join', {
      device,
      rtpCapabilities: device.rtpCapabilities
    });
    console.log(peers);

    this.emit('room:open');
  }

  async _prepareSendTransport(device) {
    const transprotInfo = await this.peer
      .request('createWebRtcTransport')
      .catch(console.error);

    this.sendTransport = device.createSendTransport(transprotInfo);
    this.sendTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      console.warn('sendTransport:connect');
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
        console.warn('sendTransport:produce');
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

    console.log(this.sendTransport);
  }

  async _prepareRecvTransport(device) {
    const transprotInfo = await this.peer
      .request('createWebRtcTransport')
      .catch(console.error);

    this._recvTransport = device.createRecvTransport(transprotInfo);
    this._recvTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      console.warn('recvTransport:connect');
      this.peer
        .request('connectWebRtcTransport', {
          transportId: this._recvTransport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });
    console.log(this._recvTransport);
  }

  onPeerRequest(req, resolve) {
    console.warn('request', req);
    resolve();
  }

  onPeerNotification(notification) {
    switch (notification.method) {
      case 'activeSpeaker':
        break;
      case 'newPeer':
      case 'peerClosed':
      default:
        console.warn('notification', notification);
    }
  }
}

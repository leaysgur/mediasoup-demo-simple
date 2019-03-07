import { Device } from 'mediasoup-client';
import { WebSocketTransport, Peer } from 'protoo-client';
import { generateRandomId } from './utils';

export default class Room {
  constructor() {
    this.peer = null;
    this._id = generateRandomId(8);
    this._sendTransport = null;
  }

  join(roomId) {
    const wsTransport = new WebSocketTransport(
      `ws://localhost:4443/?roomId=${roomId}&peerId=${this._id}`,
    );

    this.peer = new Peer(wsTransport);
    this.peer.on('open', this.onPeerOpen.bind(this));
    this.peer.on('request', this.onPeerRequest);
    this.peer.on('notification', this.onPeerNotification);
    this.peer.on('failed', console.error);
    this.peer.on('disconnected', console.error);
    this.peer.on('close', console.error);
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
  }

  async _prepareSendTransport(device) {
    const transprotInfo = await this.peer
      .request('createWebRtcTransport')
      .catch(console.error);

    this._sendTransport = device.createSendTransport(transprotInfo);
    this._sendTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      console.warn('sendTransport:connect');
      this.peer
        .request('connectWebRtcTransport', {
          transportId: this._sendTransport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });
    this._sendTransport.on(
      'produce',
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        console.warn('sendTransport:produce');
        try {
          const { id } = await this.peer.request('produce', {
            transportId: this._sendTransport.id,
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

    console.log(this._sendTransport);
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
    console.warn('notification', notification);
  }
}

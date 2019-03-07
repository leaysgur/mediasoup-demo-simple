import { Device } from 'mediasoup-client';
import { WebSocketTransport, Peer } from 'protoo-client';
import { generateRandomId } from './utils';

export default class Room {
  constructor() {
    this.device = null;
    this.peer = null;
    this._id = generateRandomId(8);
    this._sendTransport = null;
  }

  join(roomId: string) {
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
    this.device = new Device();

    const routerRtpCapabilities = await this.peer
      .request('getRouterRtpCapabilities')
      .catch(console.error);
    this.device.load({ routerRtpCapabilities });

    const transprotInfo = await this.peer
      .request('createWebRtcTransport')
      .catch(console.error);

    this._sendTransport = this.device.createSendTransport(transprotInfo);
    this._sendTransport.on('connect', (
      { dtlsParameters },
      callback,
      errback,
    ) => {
      this.peer
        .request('connectWebRtcTransport', {
          transportId: this._sendTransport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });
    console.log(this._sendTransport);
  }

  onPeerRequest(req: any, resolve: () => void) {
    console.warn('request', req);
    resolve();
  }

  onPeerNotification(notification: any) {
    console.warn('notification', notification);
  }
}

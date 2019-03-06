import { WebSocketTransport } from 'protoo-client';

interface SignalingInit {
  roomId: string;
  peerId: string;
}

export default class Signaling {
  private ws: WebSocketTransport;

  constructor(options: SignalingInit) {
    this.ws = new WebSocketTransport(
      `ws://localhost:4443/?roomId=${options.roomId}&peerId=${options.peerId}`,
    );
  }

  async getRouterCapabilities() {
    this.ws.send({});
  }
}

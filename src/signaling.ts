import { WebSocketTransport } from 'protoo-client';

export default class Signaling {
  ws: WebSocketTransport;
  constructor(roomId: string, peerId: string) {
    this.ws = new WebSocketTransport(
      `ws://localhost:4443/?roomId=${roomId}&peerId=${peerId}`,
    );
  }
}

import { WebSocketTransport } from 'protoo-client';
import { generateRandomId } from './utils';

export default class Signaling {
  private _id: string;
  private ws: WebSocketTransport | null;

  constructor() {
    this._id = generateRandomId(8);
    this.ws = null;
  }

  get id(): string {
    return this._id;
  }

  joinRoom(roomId: string) {
    this.ws = new WebSocketTransport(
      `ws://localhost:4443/?roomId=${roomId}&peerId=${this._id}`,
    );

    console.log(this.ws);
  }
}

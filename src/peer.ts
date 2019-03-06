import { Device } from 'mediasoup-client';
import { generateRandomId } from './utils';

export default class Peer {
  private _id: string;
  private _device: Device;

  constructor() {
    this._id = generateRandomId(8);
    this._device = new Device();

    console.log(this._device);
  }

  get id(): string {
    return this._id;
  }
}

import { Device } from 'mediasoup-client';
import Sign from './signaling';

export default class Peer {
  private device: Device;
  private sign: Sign;

  constructor(sign: Sign) {
    this.device = new Device();
    this.sign = sign;

    console.log(this.device, this.sign);
  }
}

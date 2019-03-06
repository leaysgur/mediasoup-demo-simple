declare module 'mediasoup-client' {
  export class Device {
    load(): void;
    canProduce(): boolean;
    createSendTransport(): any;
  }
  export const version: string;
}

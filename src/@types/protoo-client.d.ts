declare module 'protoo-client' {
  export class WebSocketTransport {
    closed: boolean;
    constructor(url: string, options?: any);
    close(): void;
    send(message: any): Promise<void>;
  }
}

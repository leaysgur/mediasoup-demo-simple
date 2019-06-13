const http = require("http");
const url = require("url");
const { WebSocketServer } = require("protoo-server");
const mediasoup = require("mediasoup");
const { createRoom } = require("./lib/Room");

const mediaCodecs = [
  {
    kind: "audio",
    name: "opus",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  },
  {
    kind: "video",
    name: "VP8",
    mimeType: "video/VP8",
    clockRate: 90000
    // parameters: {
    //   "x-google-start-bitrate": 1500
    // }
  }
];

(async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.on("died", () => {
    console.error("mediasoup Worker died, exit..");
    process.exit(1);
  });

  const router = await worker.createRouter({ mediaCodecs });
  const room = await createRoom(router);
  setInterval(() => room.logStatus(), 1000 * 10);

  const httpServer = http.createServer();
  await new Promise(resolve => {
    httpServer.listen(2345, "127.0.0.1", resolve);
  });

  const wsServer = new WebSocketServer(httpServer);

  // Handle connections from clients.
  wsServer.on("connectionrequest", (info, accept, reject) => {
    const u = url.parse(info.request.url, true);
    const peerId = u.query["peerId"];

    if (!peerId) {
      reject(400, "Connection request without peerId");

      return;
    }

    console.info(
      "protoo connection request [peerId:%s, address:%s, origin:%s]",
      peerId,
      info.socket.remoteAddress,
      info.origin
    );

    const protooWebSocketTransport = accept();
    room.handleProtooConnection({ peerId, protooWebSocketTransport });
  });
})();

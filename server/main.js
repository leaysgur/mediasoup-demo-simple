const http = require("http");
const url = require("url");
const { WebSocketServer, Room } = require("protoo-server");
const mediasoup = require("mediasoup");
const ConfRoom = require("./lib/Room");

(async () => {
  console.log("start server");

  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.on("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  const router = await worker.createRouter({
    mediaCodecs: [
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
      }
    ]
  });

  const room = new ConfRoom({
    protooRoom: new Room(),
    mediasoupRouter: router
  });
  setInterval(() => console.log("room stat", room.getStatus()), 1000 * 10);

  const httpServer = http.createServer();
  await new Promise(resolve => {
    httpServer.listen(2345, "127.0.0.1", resolve);
  });

  const wsServer = new WebSocketServer(httpServer);
  wsServer.on("connectionrequest", (info, accept, reject) => {
    const u = url.parse(info.request.url, true);
    const peerId = u.query["peerId"];

    if (!peerId) {
      reject(400, "Connection request without peerId");
      return;
    }

    console.log(
      "protoo connection request [peerId:%s, address:%s, origin:%s]",
      peerId,
      info.socket.remoteAddress,
      info.origin
    );

    const protooWebSocketTransport = accept();
    room.handleProtooConnection({ peerId, protooWebSocketTransport });
  });

  console.log("websocket server started on http://127.0.0.1:2345");
})();

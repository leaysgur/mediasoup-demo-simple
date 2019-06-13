import Room from "./room";

(async function() {
  const joinTrigger = document.getElementById("js-join-trigger");
  const sendAudioTrigger = document.getElementById("js-send-audio");
  const sendVideoTrigger = document.getElementById("js-send-video");
  const sendDisplayTrigger = document.getElementById("js-send-display");

  const remoteVideos = document.getElementById("js-remote-streams");

  joinTrigger.addEventListener("click", async () => {
    const room = new Room();
    room.join();

    room.once("@open", ({ peers }) => {
      console.log(`${peers.length} peers in this room.`);

      sendAudioTrigger.addEventListener("click", async () => {
        const localStream = await navigator.mediaDevices
          .getUserMedia({ audio: true })
          .catch(console.error);
        room.sendAudio(localStream.getAudioTracks()[0].clone());
      });
      sendVideoTrigger.addEventListener("click", async () => {
        const localStream = await navigator.mediaDevices
          .getUserMedia({ video: true })
          .catch(console.error);
        room.sendVideo(localStream.getVideoTracks()[0].clone());
      });
      sendDisplayTrigger.addEventListener("click", async () => {
        const localStream = await navigator.mediaDevices
          .getDisplayMedia({ video: true })
          .catch(console.error);
        room.sendVideo(localStream.getVideoTracks()[0].clone());
      });
    });

    room.on("@peerClosed", ({ peerId }) => {
      const el = Array.from(remoteVideos.children).find(
        el => el.getAttribute("data-peer-id") === peerId
      );
      if (el) {
        el.srcObject.getTracks().forEach(track => track.stop());
        el.remove();
      }
    });
    room.on("@consumer", async consumer => {
      const {
        appData: { peerId },
        track,
        kind
      } = consumer;
      console.log("receive consumer", kind);

      const el = document.createElement(kind);
      el.srcObject = new MediaStream([track]);
      el.setAttribute("data-peer-id", peerId);
      el.playsInline = true;
      remoteVideos.append(el);
      await el.play().catch(console.error);
    });
    room.once("@close", () => {
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });
  });
})();

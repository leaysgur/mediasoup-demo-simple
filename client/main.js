import Room from "./lib/room";

(async function() {
  const joinTrigger = document.getElementById("js-join-trigger");
  const sendAudioTrigger = document.getElementById("js-send-audio");
  const sendVideoTrigger = document.getElementById("js-send-video");
  const sendDisplayTrigger = document.getElementById("js-send-display");

  const localTracks = document.getElementById("js-local-tracks");
  const remoteTracks = document.getElementById("js-remote-tracks");

  joinTrigger.addEventListener("click", async () => {
    const room = (window.room = new Room());
    room.join();

    room.once("@open", ({ peers }) => {
      console.log(`${peers.length} peers in this room.`);

      sendAudioTrigger.addEventListener("click", async () => {
        const track = await navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(stream => stream.getAudioTracks()[0])
          .catch(console.error);
        await room.sendAudio(track);
        localTracks.append(createMediaEl(track, ""));
      });

      sendVideoTrigger.addEventListener("click", async () => {
        const track = await navigator.mediaDevices
          .getUserMedia({ video: true })
          .then(stream => stream.getVideoTracks()[0])
          .catch(console.error);
        await room.sendVideo(track);
        localTracks.append(createMediaEl(track, ""));
      });

      sendDisplayTrigger.addEventListener("click", async () => {
        const track = await navigator.mediaDevices
          .getDisplayMedia({ video: true })
          .then(stream => stream.getVideoTracks()[0])
          .catch(console.error);
        await room.sendVideo(track);
        localTracks.append(createMediaEl(track, ""));
      });
    });

    room.on("@peerJoined", ({ peerId }) => {
      console.log("new peer joined", peerId);
    });

    room.on("@peerClosed", ({ peerId }) => {
      removeMediaEl(remoteTracks, "data-peer-id", peerId);
    });

    room.on("@consumer", async consumer => {
      const {
        id,
        appData: { peerId },
        track
      } = consumer;
      console.log("receive consumer", consumer);

      const el = createMediaEl(track, peerId, id);
      remoteTracks.append(el);
    });

    room.on("@consumerClosed", ({ consumerId }) => {
      removeMediaEl(remoteTracks, "data-consumer-id", consumerId);
    });
  });
})();

function createMediaEl(track, peerId, consumerId) {
  const el = document.createElement(track.kind);
  el.srcObject = new MediaStream([track]);
  el.setAttribute("data-peer-id", peerId);
  el.setAttribute("data-consumer-id", consumerId);
  el.playsInline = true;
  el.play().catch(console.error);
  return el;
}

function removeMediaEl($container, key, id) {
  Array.from($container.children)
    .filter(el => el.getAttribute(key) === id)
    .forEach(el => {
      el.srcObject.getTracks().forEach(track => track.stop());
      el.remove();
    });
}

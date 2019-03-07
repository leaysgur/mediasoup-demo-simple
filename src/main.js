import Room from './room';

(async function() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  // const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');

  const localStream = await navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  await localVideo.play().catch(console.error);

  joinTrigger.addEventListener('click', async () => {
    const room = new Room();
    room.join(roomId.value);

    room.once('room:open', () => {
      room.sendAudio(localStream.getAudioTracks()[0]);
    });

    leaveTrigger.addEventListener('click', () => room.close(), { once: true });
  });
})();

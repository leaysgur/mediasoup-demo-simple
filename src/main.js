import { generateRandomId } from './utils';
import Room from './room';

(async function() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  // const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  roomId.value = generateRandomId(8);

  const localStream = await navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  await localVideo.play().catch(console.error);

  joinTrigger.addEventListener('click', async () => {
    console.log('join', roomId.value);

    const room = new Room();
    room.join(roomId.value);

    console.log(room);

    leaveTrigger.addEventListener(
      'click',
      () => {
        console.log('leave');
      },
      { once: true }
    );
  });
})();

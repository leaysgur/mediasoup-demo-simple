import Sign from './signaling';

(async function() {
  const localVideo = document.getElementById(
    'js-local-stream',
  ) as HTMLVideoElement;
  const joinTrigger = document.getElementById(
    'js-join-trigger',
  ) as HTMLButtonElement;
  const leaveTrigger = document.getElementById(
    'js-leave-trigger',
  ) as HTMLButtonElement;
  // const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id') as HTMLInputElement;

  const localStream = (await navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(console.error)) as MediaStream;

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  await localVideo.play().catch(console.error);

  joinTrigger.addEventListener('click', () => {
    console.log('join', roomId.value);

    const sign = new Sign('tj7rusgv', 'nbepjtom');
    console.log(sign);

    leaveTrigger.addEventListener(
      'click',
      () => {
        console.log('leave');
      },
      { once: true },
    );
  });
})();

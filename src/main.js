import Room from './room';

(async function() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');

  const localStream = await navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.controls = true;
  localVideo.srcObject = localStream;
  await localVideo.play().catch(console.error);

  joinTrigger.addEventListener('click', async () => {
    const room = new Room();
    room.join(roomId.value);

    room.once('@open', ({ peers }) => {
      console.log(`${peers.length} peers in this room.`);
      room.sendAudio(localStream.getAudioTracks()[0].clone());
      room.sendVideo(localStream.getVideoTracks()[0].clone());
    });

    room.on('@peerClosed', ({ peerId }) => {
      console.log(peerId);
      const video = Array.from(remoteVideos.children)
        .find(el => el.getAttribute('data-peer-id') === peerId);
      if (video) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.remove();
      }
    });
    room.on('@consumer', async consumer => {
      const { appData: { peerId }, track, kind } = consumer;
      console.log('receive consumer', kind);

      const video = Array.from(remoteVideos.children)
        .find(el => el.getAttribute('data-peer-id') === peerId);

      if (video) {
        video.srcObject.addTrack(track, video.srcObject);
        console.log('update video el');
      } else {
        const newVideo = document.createElement('video');
        newVideo.srcObject = new MediaStream([consumer.track]);
        newVideo.setAttribute('data-peer-id', peerId);
        newVideo.controls = true;
        remoteVideos.append(newVideo);
        await newVideo.play().catch(console.error);
        console.log('add new video el');
      }
    });
    room.once('@close', () => {
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    leaveTrigger.addEventListener('click', () => room.close(), { once: true });
  });
})();

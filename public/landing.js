// Initialize component
const createButton = document.querySelector("#createroom")
const videoCont = document.querySelector('.video-self');
const codeCont = document.querySelector('#roomcode');
const joinBut = document.querySelector('#joinroom');
const mic = document.querySelector('#mic');
const cam = document.querySelector('#webcam');


/* mediapipe */

const videoWidth = 640;
const videoHeight = 480;

// canvas settings
const mediapipeCanvas = document.createElement("canvas");
mediapipeCanvas.width = videoWidth;
mediapipeCanvas.height = videoHeight;
const mediapipeCtx = mediapipeCanvas.getContext("2d");

function onResults(results){
    mediapipeCtx.save();
    mediapipeCtx.clearRect(0, 0, mediapipeCanvas.width, mediapipeCanvas.height);

    // Only overwrite existing pixels.
    mediapipeCtx.globalCompositeOperation = 'source-in';
    mediapipeCtx.fillStyle = '#00FF00';
    mediapipeCtx.fillRect(0, 0, mediapipeCanvas.width, mediapipeCanvas.height);

    // Only overwrite missing pixels.
    mediapipeCtx.globalCompositeOperation = 'destination-atop';
    mediapipeCtx.drawImage(
        results.image, 0, 0, mediapipeCanvas.width, mediapipeCanvas.height);

    mediapipeCtx.globalCompositeOperation = 'source-over';
    drawConnectors(mediapipeCtx, results.poseLandmarks, POSE_CONNECTIONS,
                    {color: '#00FF00', lineWidth: 4});
    drawLandmarks(mediapipeCtx, results.poseLandmarks,
                    {color: '#FF0000', lineWidth: 2});
    drawConnectors(mediapipeCtx, results.faceLandmarks, FACEMESH_TESSELATION,
                    {color: '#C0C0C070', lineWidth: 1});
    drawConnectors(mediapipeCtx, results.leftHandLandmarks, HAND_CONNECTIONS,
                    {color: '#CC0000', lineWidth: 5});
    drawLandmarks(mediapipeCtx, results.leftHandLandmarks,
                    {color: '#00FF00', lineWidth: 2});
    drawConnectors(mediapipeCtx, results.rightHandLandmarks, HAND_CONNECTIONS,
                    {color: '#00CC00', lineWidth: 5});
    drawLandmarks(mediapipeCtx, results.rightHandLandmarks,
                    {color: '#FF0000', lineWidth: 2});
    mediapipeCtx.restore();

}


// getMediapipeStream

const videoElement = document.createElement("video");


function getMediapipeStream(localstream, video, audio){
    const holistic = new Holistic({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
    }});
    
    
    holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    holistic.onResults(onResults);

    videoElement.srcObject = localstream;

    const camera = new Camera(videoElement, {
        onFrame: async() => {
            await holistic.send({image: videoElement})
        },
        width: videoWidth,
        height: videoHeight
    })

    camera.start();

    let mediapipestream = new MediaStream();

    if (video){
        mediapipeCanvas.captureStream().getTracks().forEach((track) => {
            mediapipestream.addTrack(track);
        })
    }

    if (audio){
        localstream.getTracks().forEach((track) => {
            mediapipestream.addTrack(track);
        })
    }

    return mediapipestream


    
}





// microphone and camera status
let micAllowed = 1;
let camAllowed = 1;

// getUsermedia config
let mediaConstraints = { video: true, audio: true };

navigator.mediaDevices.getUserMedia(mediaConstraints)
.then(localstream => {

    let mstream = getMediapipeStream(localstream, true, true)

    videoCont.srcObject = mstream
    
})

function uuidv4() {
    return 'xxyxyxxyx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const createroomtext = 'Creating Room...';

// create room on pressing createButton
createButton.addEventListener("click", (e) => {
    e.preventDefault();
    createButton.disabled = true;
    createButton.innerHTML = "Create Button";
    createButton.classList = 'createroom-clicked';

    // innerHTML checker
    setInterval(() => {
        if (createButton.innerHTML < createroomtext){
            createButton.innerHTML = createroomtext.substring(0, createButton.innerHTML.length + 1);
        } else {
            createButton.innerHTML = createroomtext.substring(0, createButton.innerHTML.length - 3);
        }

    }, 500);

    // page transition
    location.href = `/room.html?room=${uuidv4()}`;
})

// join room on clicking url
joinBut.addEventListener("click", (e) => {
    e.preventDefault();
    if (codeCont.value.trim() == "") {
        codeCont.classList.add('roomcode-error');
        return;
    }
    const code = codeCont.value;
    location.href = `/room.html?room=${code}`
})

// code change monitor
codeCont.addEventListener('change', (e) => {
    e.preventDefault();
    if (codeCont.value.trim() !== "") {
        codeCont.classList.remove('roomcode-error');
        return;
    }
})

// start or stop camera on pressing camera icon
cam.addEventListener('click', () => {
    if (camAllowed) {

        mediaConstraints = { video: false, audio: true };

        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoCont.srcObject = localstream;
            })

        cam.classList = "nodevice";
        cam.innerHTML = `<i class="fas fa-video-slash"></i>`;
        camAllowed = 0;
    }
    else {

        if (micAllowed){
            mediaConstraints = { video: true, audio: true };
            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
        
                let mstream = getMediapipeStream(localstream, true, true);
        
                videoCont.srcObject = mstream;

            })
        } else {
            mediaConstraints = { video: true, audio: false };

            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                let mstream = getMediapipeStream(localstream, true, false);
        
                videoCont.srcObject = mediapipeStream;
            })

        }

        cam.classList = "device";
        cam.innerHTML = `<i class="fas fa-video"></i>`;
        camAllowed = 1;
    }
})

// start or stop audio on pressing microphone icon
mic.addEventListener('click', () => {
    if (micAllowed) {

        if (camAllowed){
            mediaConstraints = {video: true, audio: false};

            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
        
                let mstream = getMediapipeStream(localstream, true, false);
        
                videoCont.srcObject = mstream;

            })

        } 

        mic.classList = "nodevice";
        mic.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        micAllowed = 0;
    }
    else {
        if (camAllowed){
            mediaConstraints = { video: true, audio: true };
            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
        
                let mstream = getMediapipeStream(localstream, true, true)
        
                videoCont.srcObject = mstream;
                
            })
        } else {
            mediaConstraints = { video: false, audio: true };

            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoCont.srcObject = localstream;
            })
        }

        mic.innerHTML = `<i class="fas fa-microphone"></i>`;
        mic.classList = "device";
        micAllowed = 1;
    }
})



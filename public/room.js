const socket = io();
const myvideo = document.querySelector("#vd1");
const roomid = params.get("room");
let username;
const chatRoom = document.querySelector('.chat-cont');
const sendButton = document.querySelector('.chat-send');
const messageField = document.querySelector('.chat-input');
const videoContainer = document.querySelector('#vcont');
const overlayContainer = document.querySelector('#overlay')
const continueButt = document.querySelector('.continue-name');
const nameField = document.querySelector('#name-field');
const videoButt = document.querySelector('.novideo');
const audioButt = document.querySelector('.audio');
const cutCall = document.querySelector('.cutcall');
const screenShareButt = document.querySelector('.screenshare');



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


// video stream part

let videoAllowed = 1;
let audioAllowed = 1;

let videoInfo = {};
let micInfo = {};

let videoTrackReceived = {};

let mymuteicon = document.querySelector("#mymuteicon");
mymuteicon.style.visibility = "hidden";

let myvideooff = document.querySelector("#myvideooff");
myvideooff.style.visibility = "hidden";

// turn server configuration
const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }

// required global variables
let connections = {};
let cName = {};
let audioTrackSent = {};
let videoTrackSent = {};

let mystream, myscreenshare;


// enter name before staring video meeting
document.querySelector('.roomcode').innerHTML = `${roomid}`

function CopyClassText(){
    var textToCopy = document.querySelector('.roomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    }
    else {
        currentRange = false;
    }

    var CopyRange = document.createRange();
    CopyRange.selectNode(textToCopy);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);

    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }

    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(()=>{
        document.querySelector(".copycode-button").textContent = "Copy Code";
    }, 5000);
}

continueButt.addEventListener('click', () => {
    if (nameField.value == '') return;
    username = nameField.value;
    overlayContainer.style.visibility = 'hidden';
    document.querySelector("#myname").innerHTML = `${username} (You)`;
    socket.emit("join room", roomid, username);

})

nameField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueButt.click();
    }
});

// Error handling function
function handleGetUserMediaError(e){
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

}

function reportError(e) {
    console.log(e);
    return;
}


let peerConnection;
let mediaConstraints = { video: true, audio: true }

// screen share code
//Thanks to (https://github.com/miroslavpejic85) for ScreenShare Code

screenShareButt.addEventListener('click', () => {
    screenShareToggle();
});
let screenshareEnabled = false;
function screenShareToggle() {
    let screenMediaPromise;
    if (!screenshareEnabled) {
        if (navigator.getDisplayMedia) {
            screenMediaPromise = navigator.getDisplayMedia({ video: true });
        } else if (navigator.mediaDevices.getDisplayMedia) {
            screenMediaPromise = navigator.mediaDevices.getDisplayMedia({ video: true });
        } else {
            screenMediaPromise = navigator.mediaDevices.getUserMedia({
                video: { mediaSource: "screen" },
            });
        }
    } else {
        screenMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });
    }
    screenMediaPromise
        .then((myscreenshare) => {
            screenshareEnabled = !screenshareEnabled;
            for (let key in connections) {
                const sender = connections[key]
                    .getSenders()
                    .find((s) => (s.track ? s.track.kind === "video" : false));
                sender.replaceTrack(myscreenshare.getVideoTracks()[0]);
            }
            myscreenshare.getVideoTracks()[0].enabled = true;
            const newStream = new MediaStream([
                myscreenshare.getVideoTracks()[0], 
            ]);
            myvideo.srcObject = newStream;
            myvideo.muted = true;
            mystream = newStream;
            screenShareButt.innerHTML = (screenshareEnabled 
                ? `<i class="fas fa-desktop"></i><span class="tooltiptext">Stop Share Screen</span>`
                : `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`
            );
            myscreenshare.getVideoTracks()[0].onended = function() {
                if (screenshareEnabled) screenShareToggle();
            };
        })
        .catch((e) => {
            alert("Unable to share screen:" + e.message);
            console.error(e);
        });
}



/* socket event handler part */

function startCall(){
    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(localstream => {
        // write getMediapipeStream()
        let mstream = getMediapipeStream(localstream, true, true)
        myvideo.srcObject = mstream;
        myvideo.muted = true;

        
        mstream.getTracks().forEach((track) => {
            for (let key in connections){
                connections[key].addTrack(track, localstream);
                if (track.kind === "audio"){
                    audioTrackSent[key] = track
                } else {
                    videoTrackSent[key] = track
                }
            }
        })
        
    })
    .catch(handleGetUserMediaError);
}


function handleVideoOffer(offer, sid, cname, micinf, vidinf){
    console.log('video offered recevied');
    cName[sid] = cname;
    micInfo[sid] = micinf;
    videoInfo[sid] = vidinf;

    // create new peer connection
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function(e){
        if (e.candidate){
            console.log('icecandidate fired');
            socket.emit("new icecandidate", e.candidate, sid);
        }
    }

    connections[sid].ontrack = function(e){
        if (!document.getElementById(sid)){
            console.log("track event fired");
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');

            videoOff.classList.add("video-off");
            muteIcon.classList.add("mute-icon");
            name.classList.add("nametag");
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            muteIcon.id = `mute${sid}`;
            videoOff.id = `vidoff${sid}`;
            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            videoOff.innerHTML = 'Video Off'
            vidCont.classList.add('video-box');

            newvideo.classList.add("video-frame");
            newvideo.autoplay = true;
            newvideo.playsInline = true;
            newvideo.id = `video${sid}`;
            newvideo.srcObject = e.streams[0];


            if (micInfo[sid] == "on"){
                muteIcon.style.visibility = 'hidden';
            } else {
                muteIcon.style.visibility = 'visible';
            }

            if (videoInfo[sid] == "on"){
                videoOff.style.visibility = 'hidden';
            } else {
                videoOff.style.visibility = 'visible';
            }

            // create new videoCont
            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);


            videoContainer.appendChild(vidCont);

        }
    };

    connections[sid].onremovetrack = function(e){
        if (document.getElementById(sid)){
            document.getElementById(sid).remove();
            console.log('removed a track');
        }
    };

    connections[sid].onnegotiationneeded = function(){
        connections[sid].createOffer()
        .then(offer => {
            return connections[sid].serLocalDescription(offer);
        })
        .then(() => {
            socket.emit("video-offer", connections[sid].localDescription, sid);
        })
        .catch(reportError)

    };


    // set remote peerconnection
    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
    .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
    .then((localStream) => {

        // write getMediapipeStream()
        let mstream = getMediapipeStream(localStream, true, true);

        mstream.getTracks().forEach((track) => {
            connections[sid].addTrack(track, localStream);
            console.log('added local stream to peer')
            if (track.kind === 'audio') {
                audioTrackSent[sid] = track;
                if (!audioAllowed)
                    audioTrackSent[sid].enabled = false;
            }
            else {
                videoTrackSent[sid] = track;
                if (!videoAllowed)
                    videoTrackSent[sid].enabled = false
            }

        })
    })
    .then(() => {
        return connections[sid].createAnswer();
    })
    .then((answer) => {
        return connections[sid].setLocalDescription(answer);
    })
    .then(() => {
        socket.emit("video-answer", connections[sid].localDescription, sid);
    })
    .catch(handleGetUserMediaError);

}

function handleNewIceCandidate(candidate, sid) {
    console.log('new candidate recieved')
    var newcandidate = new RTCIceCandidate(candidate);

    connections[sid].addIceCandidate(newcandidate)
        .catch(reportError);
}

function handleVideoAnswer(answer, sid) {
    console.log('answered the offer')
    const ans = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(ans);
}


async function handleJoinRoom(conc, cnames, micinfo, videoinfo){
    socket.emit("getCanvas");
    if (cnames)
        cName = cnames;

    if (micinfo)
        micInfo = micinfo;

    if (videoinfo)
        videoInfo = videoinfo;


    console.log(cName);

    if (conc){
        await conc.forEach(sid => {
            // reference: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
            // create new RTC peerconnection
            connections[sid] = new RTCPeerConnection(configuration);

            // interactive connectivity establishment(ICE)
            connections[sid].onicecandidate = function(e){
                if (e.candidate){
                    console.log('icecandidate fired');
                    socket.emit("new icecandidate", e.candidate, sid);
                }
            }

            // if the first stream is in the incoming track
            connections[sid].ontrack = function(e){
                if (!document.getElementById(sid)) {
                    console.log('track event fired')
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let muteIcon = document.createElement('div');
                    let videoOff = document.createElement('div');
                    videoOff.classList.add('video-off');
                    muteIcon.classList.add('mute-icon');
                    name.classList.add('nametag');
                    name.innerHTML = `${cName[sid]}`;
                    vidCont.id = sid;
                    muteIcon.id = `mute${sid}`;
                    videoOff.id = `vidoff${sid}`;
                    muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
                    videoOff.innerHTML = 'Video Off'
                    vidCont.classList.add('video-box');
                    newvideo.classList.add('video-frame');
                    newvideo.autoplay = true;
                    newvideo.playsinline = true;
                    newvideo.id = `video${sid}`;
                    newvideo.srcObject = event.streams[0];

                    if (micInfo[sid] == 'on')
                        muteIcon.style.visibility = 'hidden';
                    else
                        muteIcon.style.visibility = 'visible';

                    if (videoInfo[sid] == 'on')
                        videoOff.style.visibility = 'hidden';
                    else
                        videoOff.style.visibility = 'visible';

                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(muteIcon);
                    vidCont.appendChild(videoOff);

                    videoContainer.appendChild(vidCont);

                }
            };


            // remove track
            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {

                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {

                        // send the offer to the remote peer connection to signaling server
                        socket.emit('video-offer', connections[sid].localDescription, sid);

                    })
                    .catch(reportError);
            };
        })

        console.log('added all sockets to connections');
        startCall();

    } else {
        console.log('waiting for someone to join');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            // write getMediapipeStream()
            let mstream = getMediapipeStream(localStream, true, true);
            myvideo.srcObject = mstream;
            myvideo.muted = true;
            mystream = mstream;
        })
        .catch(handleGetUserMediaError)

    }

}

function handleRemovePeer(sid){
    if (document.getElementById(sid)){
        document.getElementById(sid).remove();
    }

    delete connections[sid]
}

function handleMessage(msg, sendername, time){
    chatRoom.scrollTop = chatRoom.scrollHeight;
    chatRoom.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`
}


function handleAction(msg, sid){
    if (msg === "mute"){
        console.log(sid + ' muted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'visible';
        micInfo[sid] = "off";
    } else if (msg === "unmute"){
        console.log(sid + ' unmuted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'hidden';
        micInfo[sid] = "on";
    } else if (msg === "videooff"){
        console.log(sid + 'turned video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    } else if (msg === "videoon"){
        console.log(sid + 'turned video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }

}

function handleUseerCount(count){
    if (count > 1){
        videoContainer.className = 'video-cont';
    } else {
        videoContainer.className = 'video-cont-single';
    }

}

// socket
socket.on("video-offer", handleVideoOffer);
socket.on("new icecandidate", handleNewIceCandidate);
socket.on("video-answer", handleVideoAnswer);
socket.on("join room", handleJoinRoom);
socket.on("message", handleMessage);
socket.on("remove peer", handleRemovePeer);
socket.on("action", handleAction);
socket.on("user count", handleUseerCount)


/* chat message part */
sendButton.addEventListener('click', () => {
    const msg = messageField.value;
    messageField.value = '';
    socket.emit('message', msg, username, roomid);
})

messageField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendButton.click();
    }
});

/* icon button click event handler */

// video icon
videoButt.addEventListener("click", () => {
    if (videoAllowed){
        // disable video
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoButt.innerHTML = `<i class="fas fa-video-slash"></i>`;
        videoAllowed = 0;
        videoButt.style.backgroundColor = "#b12c2c";

        if (mystream){
            mystream.getTracks().forEach((track) => {
                if (track.kind === "video"){
                    track.enabled = false;
                }
            })
        }

        myvideooff.style.visibility = 'visible';
        socket.emit("action", "videooff");

    } else {
        // enable video
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoButt.innerHTML = `<i class="fas fa-video"></i>`;
        videoAllowed = 1;
        videoButt.style.backgroundColor = "#4ECCA3";

        if (mystream){
            mystream.getTracks().forEach((track) => {
                if (track.kind === "video"){
                    track.enabled = true;
                }
            })
        }

        myvideooff.style.visibility = 'hidden';
        socket.emit("action", "videoon");


    }
})

// audio icon
audioButt.addEventListener("click", () => {
    if (audioAllowed){
        // disable audio
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = false;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        audioAllowed = 0;
        audioButt.style.backgroundColor = "#b12c2c";

        if (mystream){
            mystream.getTracks().forEach((track) => {
                if (track.kind === "audio"){
                    track.enabled = false;
                }
            })
        }

        mymuteicon.style.visibility = "visible";
        socket.emit("action", "mute")

    } else {
        // enable audio
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = true;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone"></i>`;
        audioAllowed = 1;
        audioButt.style.backgroundColor = "#4ECCA3";

        if (mystream){
            mystream.getTracks().forEach((track) => {
                if (track.kind === "audio"){
                    track.enabled = true;
                }
            })
        }

        mymuteicon.style.visibility = "hidden";
        socket.emit("action", "unmute")

    }
})

cutCall.addEventListener('click', () => {
    location.href = '/';
})

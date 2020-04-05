"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const image_capture_1 = require("image-capture");
class AppParticipant {
    constructor(id) {
        this.id = id;
        this.videoTracks = new Array();
        this.audioTracks = new Array();
    }
    captureImage() {
        let track = this.videoTracks[0];
        const img = document.createElement('img');
        let imageCapture = new image_capture_1.ImageCapture(track);
        return new Promise((resolve, reject) => {
            imageCapture.grabFrame()
                .then(blob => {
                resolve(blob);
            })
                .catch(reject);
        });
    }
    addVideoTrack(t) {
        this.videoTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            this.onVideoTrackLost(this.id, stream, t);
        };
        this.onVideoTrackAdded(this.id, stream, t);
    }
    addAudioTrack(t) {
        this.audioTracks.push(t);
        let audio = new Audio();
        audio.classList.add(".p" + this.id);
        audio.autoplay = true;
        audio.srcObject = new MediaStream([t]);
        return audio;
    }
    addTrack(t, cb) {
        if (t.kind == "video") {
            this.addVideoTrack(t);
        }
        else {
            let a = this.addAudioTrack(t);
            if (cb)
                cb(a);
        }
        //t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}
exports.AppParticipant = AppParticipant;

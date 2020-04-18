"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const image_capture_1 = require("image-capture");
class AppParticipant {
    constructor(id) {
        this.id = id;
        this.videoTracks = new Array();
        this.audioTracks = new Array();
    }
    getTracks() {
        let tracks = new Array();
        tracks.push(this.videoTracks[0]);
        tracks.push(this.audioTracks[0]);
        return tracks;
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
            if (this.onVideoTrackLost)
                this.onVideoTrackLost(this.id, stream, t);
        };
        this.onVideoTrackAdded(this.id, stream, t);
    }
    addAudioTrack(t) {
        this.audioTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            if (this.onAudioTrackLost)
                this.onAudioTrackLost(this.id, stream, t);
        };
        this.onAudioTrackAdded(this.id, stream, t);
    }
    addTrack(t) {
        if (t.kind == "video") {
            this.addVideoTrack(t);
        }
        else {
            this.addAudioTrack(t);
        }
    }
}
exports.AppParticipant = AppParticipant;

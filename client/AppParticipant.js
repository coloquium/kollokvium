"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppParticipant {
    constructor(id) {
        this.id = id;
        this.videoTracks = new Array();
        this.audioTracks = new Array();
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

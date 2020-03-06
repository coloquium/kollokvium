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
            document.querySelector(".p" + this.id).remove();
        };
        this.onVideoAdded(this.id, stream);
    }
    addAudioTrack(t) {
        this.audioTracks.push(t);
        let audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = new MediaStream([t]);
    }
    addTrack(t) {
        t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}
exports.AppParticipant = AppParticipant;

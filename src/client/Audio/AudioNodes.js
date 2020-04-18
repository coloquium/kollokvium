"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AudioNodes {
    constructor() {
        this.nodes = new Map();
    }
    add(id, mediaStream) {
        let audio = new Audio();
        audio.autoplay = true;
        audio.muted = false;
        audio.srcObject = mediaStream;
        this.nodes.set(id, audio);
    }
    remove(id) {
        this.nodes.delete(id);
    }
    toggleMute(id) {
        const state = !this.nodes.get(id).muted;
        this.nodes.get(id).muted = !this.nodes.get(id).muted;
    }
    toggleMuteAll() {
        Array.from(this.nodes.values()).forEach((el) => {
            el.muted = !el.muted;
        });
    }
    removeAll() {
        this.nodes.clear();
    }
}
exports.AudioNodes = AudioNodes;

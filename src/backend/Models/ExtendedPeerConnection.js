"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ExtendedPeerConnection {
    constructor(context, peerId) {
        this.context = context;
        this.peerId = peerId;
        this.locked = false;
    }
}
exports.ExtendedPeerConnection = ExtendedPeerConnection;

export class ExtendedPeerConnection {
    context: string;
    peerId: string;
    locked: boolean;
    constructor(context?: string, peerId?: string) {
        this.context = context;
        this.peerId = peerId;
        this.locked = false;
    }
}

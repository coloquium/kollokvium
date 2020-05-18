export class ExtendedPeerConnection {
    context: string;
    peerId: string;
    locked: boolean;
    alias: any;
    created: number;
    constructor(context?: string, peerId?: string) {
        this.context = context;
        this.peerId = peerId;
        this.locked = false;
        this.created = Date.now();        
    }
}

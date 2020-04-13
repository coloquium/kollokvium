export class AudioNodes {
    nodes: Map<string, HTMLAudioElement>;
    constructor() {
        this.nodes = new Map<string, HTMLAudioElement>();
    }
    add(id: string, mediaStream: MediaStream): void {
        let audio = new Audio();
        audio.autoplay = true;
        audio.muted = false;
        audio.srcObject = mediaStream;
        this.nodes.set(id, audio);
    }
    remove(id: string): void {
        this.nodes.delete(id);
    }
    toggleMute(id: string): void {
        const state = !this.nodes.get(id).muted;
        this.nodes.get(id).muted = !this.nodes.get(id).muted;
    }
    toggleMuteAll(): void {
        Array.from(this.nodes.values()).forEach((el: HTMLAudioElement) => {
            el.muted = !el.muted;
        });
    }
    removeAll(): void {
        this.nodes.clear();
    }
}

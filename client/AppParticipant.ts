export class AppParticipant {
    audioTracks: Array<MediaStreamTrack>;
    videoTracks: Array<MediaStreamTrack>;
    onVideoAdded: (id: string, s: MediaStream) => void;
    constructor(public id: string) {
        this.videoTracks = new Array<MediaStreamTrack>();
        this.audioTracks = new Array<MediaStreamTrack>();
    }
    addVideoTrack(t: MediaStreamTrack) {
        this.videoTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            document.querySelector(".p" + this.id).remove();
        };
        this.onVideoAdded(this.id, stream);
    }
    addAudioTrack(t: MediaStreamTrack) {
        this.audioTracks.push(t);
        let audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = new MediaStream([t]);
    }
    addTrack(t: MediaStreamTrack) {
        t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}

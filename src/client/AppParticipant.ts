import { ImageCapture } from 'image-capture';
export class AppParticipant {
    audioTracks: Array<MediaStreamTrack>;
    videoTracks: Array<MediaStreamTrack>;
    onVideoTrackLost: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onVideoTrackAdded: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onAudioTrackAdded: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onAudioTrackLost: (id: string, s: MediaStream, t: MediaStreamTrack) => void;

    constructor(public id: string) {
        this.videoTracks = new Array<MediaStreamTrack>();
        this.audioTracks = new Array<MediaStreamTrack>();
    }

    getTracks():Array<MediaStreamTrack>{
        let tracks = new Array<MediaStreamTrack>();
        tracks.push(this.videoTracks[0]);
        tracks.push(this.audioTracks[0]);        
        return tracks;
    }

    captureImage(): Promise<ImageBitmap> {
        let track = this.videoTracks[0];
        const img = document.createElement('img');
        let imageCapture = new ImageCapture(track)
        return new Promise<ImageBitmap>((resolve, reject) => {
            imageCapture.grabFrame()
                .then(blob => {
                    resolve(blob);
                })
                .catch(reject)
        });
    }
    addVideoTrack(t: MediaStreamTrack) {
        this.videoTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            if (this.onVideoTrackLost)
                this.onVideoTrackLost(this.id, stream, t);

        };
        this.onVideoTrackAdded(this.id, stream, t);
    }
    addAudioTrack(t: MediaStreamTrack): void {
        this.audioTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            if (this.onAudioTrackLost)
                this.onAudioTrackLost(this.id, stream, t);

        };
        this.onAudioTrackAdded(this.id, stream, t);

    }
    addTrack(t: MediaStreamTrack) {
        if (t.kind == "video") {
            this.addVideoTrack(t)
        } else {
            this.addAudioTrack(t);
        }
    }
}

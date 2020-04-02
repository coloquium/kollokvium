import {ImageCapture} from 'image-capture'; 
export class AppParticipant {
    audioTracks: Array<MediaStreamTrack>;
    videoTracks: Array<MediaStreamTrack>;
    onVideoTrackLost: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onVideoTrackAdded: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    constructor(public id: string) {
        this.videoTracks = new Array<MediaStreamTrack>();
        this.audioTracks = new Array<MediaStreamTrack>();
    }

    captureImage(): Promise<ImageBitmap> {
        let track = this.videoTracks[0];
       const img = document.createElement('img');
        let imageCapture = new ImageCapture(track)
        return new Promise<ImageBitmap>( (resolve,reject ) => {
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
            this.onVideoTrackLost(this.id, stream, t);

        };
        this.onVideoTrackAdded(this.id, stream, t);
    }
    addAudioTrack(t: MediaStreamTrack): HTMLAudioElement {
        this.audioTracks.push(t);
        let audio = new Audio();
        audio.classList.add(".p" + this.id);
        audio.autoplay = true;
        audio.srcObject = new MediaStream([t]);
        return audio;
    }
    addTrack(t: MediaStreamTrack, cb?: Function) {
        if (t.kind == "video") {
            this.addVideoTrack(t)
        } else {
            let a = this.addAudioTrack(t);
            if (cb) cb(a);
        }
        //t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}

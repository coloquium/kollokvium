import { ImageCapture } from 'image-capture';
import { DOMUtils } from '../Helpers/DOMUtils';
import { MediaStreamRecorder } from 'mediastreamblender';

export class AppParticipantComponent {
    audioTracks: Array<MediaStreamTrack>;
    videoTracks: Array<MediaStreamTrack>;
    onVideoTrackLost: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onVideoTrackAdded: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onAudioTrackAdded: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    onAudioTrackLost: (id: string, s: MediaStream, t: MediaStreamTrack) => void;
    recorder: MediaStreamRecorder;
    isRecording: boolean;

    constructor(public id: string) {
        this.videoTracks = new Array<MediaStreamTrack>();
        this.audioTracks = new Array<MediaStreamTrack>();
    }
    displayRecording(blobUrl: string) {
        let p = document.createElement("p");
        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = "Your recording has ended, here is the file. ( click to download )";
        download.setAttribute("download", `${Math.random().toString(36).substring(6)}.webm`);
        p.append(download);
        DOMUtils.get("#recorder-download").append(p);
        $("#recorder-result").modal("show");
    }


    recordStream(id: string) {
        if (!this.isRecording) {
            let tracks = this.getTracks();
            this.recorder = new MediaStreamRecorder(tracks);
            this.recorder.start(10);
            this.isRecording = true;
        } else {
            DOMUtils.get("i.is-recording").classList.remove("flash");
            this.isRecording = false;
            this.recorder.stop();
            this.recorder.flush().then((blobUrl: string) => {
                this.displayRecording(blobUrl);
            });
        }
    }

    addVideo(id: string, mediaStream: MediaStream) {

        const participant = DOMUtils.get(".p" + id);

        let video = document.createElement("video");
        video.poster = "/img/novideo.png";
        video.srcObject = mediaStream;
        video.width = 1280;
        video.height = 720;
        video.autoplay = true;
        video.setAttribute("playsinline", '');

        DOMUtils.get("img", participant).remove();
        participant.append(video);

        DOMUtils.get(".video-tools", participant).classList.remove("d-none");

    }

    render(target: HTMLElement) {

        let item = document.createElement("li");
        item.classList.add("p" + this.id);

        let namebadge = document.createElement("span");
        namebadge.classList.add("namebadge");
        namebadge.classList.add("n" + this.id)
        namebadge.textContent = "...";
        item.append(namebadge);

        let novideoImage = document.createElement("img");
        novideoImage.src = "/img/novideo.png";

        item.append(novideoImage);

        let tools = document.createElement("div");
        tools.classList.add("video-tools", "p2", "darken", "d-none");
        let fullscreen = document.createElement("i");
        fullscreen.classList.add("fas", "fa-arrows-alt", "fa-2x", "white")
        fullscreen.addEventListener("click", (e) => {
            let elem = DOMUtils.get(`.p${this.id} video`);
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
        let record = document.createElement("i");
        record.classList.add("fas", "fa-circle", "fa-2x", "red")
        record.addEventListener("click", () => {
            if (!this.isRecording)
                record.classList.add("flash", "is-recording");
            this.recordStream(this.id);
        });

        tools.append(fullscreen);
        tools.append(record);
        item.prepend(tools);


        let subtitles = document.createElement("div");
        subtitles.classList.add("subtitles");
        subtitles.classList.add("subs" + this.id);

        item.append(subtitles);

        target.append(item);

    }
   

    getTracks(): Array<MediaStreamTrack> {
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

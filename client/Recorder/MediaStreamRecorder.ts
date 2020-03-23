declare var MediaRecorder: any;
export class MediaStreamRecorder{
    data: Array<Blob>;
    recorder: any;
    mediaStream: MediaStream;
    toBlob():string{
        let blob = new Blob(this.data, {
            type: 'video/webm'
          });
        return URL.createObjectURL(blob);
    }
    constructor(public tracks:Array<MediaStreamTrack>){
        this.mediaStream = new MediaStream(tracks);
        this.recorder = new MediaRecorder(this.mediaStream,{
            mimeType:'video/webm;codecs=vp9'});

        this.recorder.ondataavailable = (e:any) =>{
            if(e.data.size > 0)
                this.data.push(e.data);
        }        
    }
    flush(r:any):Promise<string>{
            return new Promise((resolve, reject) => {
                    r ==resolve(this.toBlob());
                    this.data = new Array<Blob>();
            });
        }
    stop(){
        this.recorder.stop();
    }
    start(n:number){
            this.data = new Array<Blob>();
            this.recorder.start(n)
    }
}
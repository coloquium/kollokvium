export class SpeechDetector {
    audioContext: AudioContext;
    mediaStreamSource: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    ondataavailable: ((rms: number) => void) | undefined;
    onspeechstarted: ((rms:number) => void) | undefined;
    onspeechended: ((rms:number) => void) | undefined;
    history: Array<number> | undefined;
    private _interval: any = 0;
    isSpeaking: boolean = false;
    avg = (arr: Array<number>) => arr.reduce((a, b) => a + b, 0) / arr.length;
    constructor(public mediaStream: MediaStream, public minDecibel: number, public historySize: number) {
        this.history = new Array<number>(historySize);
        this.history.fill(0);
        this.audioContext = new AudioContext();
        this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream);
        this.processor = this.audioContext.createScriptProcessor(512, 1, 1);
        this.mediaStreamSource.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        this.processor.onaudioprocess = (evt: AudioProcessingEvent) => {
            const channelData = evt.inputBuffer.getChannelData(0);
            var total = 0;
            for (let i = 0; i < channelData.length; i++) {
                total += Math.abs(channelData[i++]);
            }
            const rms = Math.sqrt(total / channelData.length);
            this.history?.pop();
            this.history?.unshift(rms);
            if (this.ondataavailable) this.ondataavailable(rms * 100);
        };
    }
    start(n: number): void {
        let prior = 0;
        this._interval = setInterval(() => {
            if (this.history) {
                const avg = this.avg(this.history) * 100;
                if (avg > this.minDecibel) {
                    if (!this.isSpeaking) {
                        this.onspeechstarted && this.onspeechstarted(avg);                      
                    }
                    this.isSpeaking = true;

                } else {
                    if (this.isSpeaking) {
                        this.onspeechended && this.onspeechended(avg);
                    }
                    this.isSpeaking = false;
                }
                prior = avg;
            }

        }, n);

    }
    stop(): void {
        clearInterval(this._interval);
    }
}
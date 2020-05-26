export class SoundFx {
    private sounds: Map<string, HTMLAudioElement>;
    constructor(private files: Array<{
        key: string;
        url: string;
    }>) {
        this.sounds = new Map<string, HTMLAudioElement>();
    }
    init() {
        this.files.forEach((file) => {
            let p = document.createElement("audio");
            p.dataset.key = file.key;
            p.onload = () => {
                this.sounds.set(p.dataset.key, p);
            };
            p.src = file.url;
        });
    }
    play(key: string): void {
        if(!this.sounds.has(key)) throw `cannot play ${key}`
        this.sounds.get(key).play();
    }
    stop(key: string): void {
        if(!this.sounds.has(key)) throw `cannot play ${key}`
        this.sounds.get(key).pause();
        this.sounds.get(key).currentTime = 0;
    }
    static getInstance(files: Array<{
        key: string;
        url: string;
    }>): SoundFx {
        return new SoundFx(files);
    }
}

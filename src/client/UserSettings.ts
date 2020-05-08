import { SlugHistory } from './SlugHistory';
import { DetectResolutions } from "./Helpers/DetectResolutions";
export class UserSettings {

    static failSafeConstraints(): MediaStreamConstraints {
        return{
            video: true, audio: true,
        };
    }
    static defaultConstraints(shouldFaceUser?:boolean): MediaStreamConstraints {

        let constraints = {
            video: {
                width: { min: 320, max: 1280, ideal: 1280 },
                height: { min: 240, max: 720, ideal: 720 },
                frameRate: 25,
                facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' },
            }, audio: true,
        };

        // let makeItFail = {
        //     video: {
        //         width: { exact: 1920},
        //         height: { exact: 1080 },
        //         frameRate: 25,
        //         facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' },
        //     }, audio: true,
        // };

        return constraints;

    }

    slugHistory: SlugHistory;
    videoDevice: string;
    audioDevice: string;
    videoResolution: string;
    showQuickStart: boolean;
    language: string;
    nickname: string;
    saveSetting() {
        const data = {
            slugHistory: this.slugHistory.history,
            videoDevice: this.videoDevice,
            audioDevice: this.audioDevice,
            videoResolution: this.videoResolution,
            nickname: this.nickname,
            showQuickStart: this.showQuickStart,
            language: this.language
        };
        localStorage.setItem("settings", JSON.stringify(data));
    }
    createConstraints(candidate: string, shouldFaceUser?: boolean): MediaStreamConstraints {


        let constraints: MediaStreamConstraints;

        if (candidate.length === 0) {
            constraints = UserSettings.defaultConstraints(true);

        } else {
            const preferedResolution = DetectResolutions.getCandidate(candidate);

            constraints = {
                audio: true,
                video: {
                    width: { exact: preferedResolution.width },
                    height: { exact: preferedResolution.height },
                    frameRate: 25,
                    facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' }
                }
            };
        };
        if (this.audioDevice.length > 0) {
            constraints.video["deviceId"] = this.audioDevice
        }
        if (this.videoDevice.length > 0) {
            constraints.video["deviceId"] = this.videoDevice
        }
        return constraints;
    }
    constructor() {
        this.slugHistory = new SlugHistory();
        const ls = localStorage.getItem("settings");
        if (ls) {
            let settings = JSON.parse(ls);
            this.audioDevice = settings.audioDevice;
            this.videoDevice = settings.videoDevice;
            this.videoResolution = settings.videoResolution;
            this.nickname = settings.nickname;
            this.slugHistory.history = settings.slugHistory;
            this.showQuickStart = settings.showQuickStart;
            this.language = settings.language || "";
        }
        else {
            this.slugHistory.history = new Array<string>();
            this.nickname = Math.random().toString(36).substring(8);
            this.audioDevice = ""; this.videoDevice = "";
            this.videoResolution = "";
            this.showQuickStart = true;
            this.language = ""
        }
    }
}

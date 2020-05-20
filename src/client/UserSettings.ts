import { SlugHistory } from './SlugHistory';
import { DetectResolutions } from "./Helpers/DetectResolutions";
import { DOMUtils } from './Helpers/DOMUtils';
export class UserSettings {

    slugHistory: SlugHistory;
    videoDevice: string;
    audioDeviceIn: string;
    audioDeviceOut: string;
    videoResolution: string;
    showQuickStart: boolean;
    facingMode: string; // should be enums?
    language: string;
    nickname: string;

    static failSafeConstraints(): MediaStreamConstraints {
        return {
            video: true, audio: true,
        };
    }
    static cameraResolutions(current?:string) {
        let parent = DOMUtils.get("#sel-video-res");
        DetectResolutions.candidates.forEach ( (candidate:any) => {

            let option = document.createElement("option");
            option.textContent = `${candidate.label} ${candidate.width} x ${candidate.height} ${candidate.ratio}`;
            option.value = candidate.label;
            if(current === candidate.label) option.selected = true;
            parent.append(option);
        });
    }

    static defaultConstraints(videoDeviceId?, resolution?,
        shouldFaceUser?: boolean): MediaStreamConstraints {
        return UserSettings.createConstraints(videoDeviceId, resolution, shouldFaceUser);
    }

    saveSetting() {
        const data = {
            slugHistory: this.slugHistory.history,
            videoDevice: this.videoDevice,
            audioDeviceIn: this.audioDeviceIn,
            audioDeviceOut: this.audioDeviceOut,
            videoResolution: this.videoResolution,
            nickname: this.nickname,
            showQuickStart: this.showQuickStart,
            language: this.language
        };
        localStorage.setItem("settings", JSON.stringify(data));
    }
    static createConstraints(videoDeviceId?: string, candidate?: string, shouldFaceUser?: boolean): MediaStreamConstraints {
        let constraints: MediaStreamConstraints;
        // if no specific resolution provided use default when a preered device is set.
        if (videoDeviceId && !candidate) {
            constraints = {
                audio: true,
                video: {
                    width: { min: 320, max: 1280, ideal: 1280 },
                    height: { min: 240, max: 720, ideal: 720 },
                    frameRate: 30,
                    facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' }
                }
            };

        } else if (videoDeviceId && candidate) { // we both have a prefered resolution and device 
            const preferedResolution = DetectResolutions.getCandidate(candidate);
            constraints = {
                audio: true,
                video: {
                    width: { exact: preferedResolution.width },
                    height: { exact: preferedResolution.height },
                    frameRate: 30,
                    facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' }
                }
            };
        } else if (!videoDeviceId && candidate) { // no prefered device, but a resolution..
            const preferedResolution = DetectResolutions.getCandidate(candidate);
            constraints = {
                audio: true,
                video: {
                    width: { exact: preferedResolution.width },
                    height: { exact: preferedResolution.height },
                    frameRate: 30,
                    facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' }
                }
            };
        } else { // Nothing set at all, default..
            return {
                video: {
                    width: { min: 320, max: 1280, ideal: 1280 },
                    height: { min: 240, max: 720, ideal: 720 },
                    frameRate: 30,
                    facingMode: { ideal: shouldFaceUser ? 'user' : 'environment' },
                }, audio: true,
            };

        };
        if (videoDeviceId) {
            constraints.video["deviceId"] = videoDeviceId
        }
        return constraints;
    }
    constructor() {
        this.slugHistory = new SlugHistory();
        const ls = localStorage.getItem("settings");
        if (ls) {
            let settings = JSON.parse(ls);
            this.audioDeviceIn = settings.audioDeviceIn;
            this.audioDeviceOut = settings.audioDeviceOut;
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
            this.audioDeviceIn = ""; 
            this.audioDeviceOut = ""; 
            this.videoDevice = "";
            this.videoResolution = "";
            this.showQuickStart = true;
            this.language = ""
        }
    }
}

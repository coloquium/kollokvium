import { SlugHistory } from './SlugHistory';
import { DetectResolutions } from "./Helpers/DetectResolutions";
import { DOMUtils } from './Helpers/DOMUtils';
export class UserSettings {

    
    static slugHistory: SlugHistory;
    static videoDevice: string;
    static audioDeviceIn: string;
    static  audioDeviceOut: string;
    static videoResolution: string;
    static showQuickStart: boolean;
    static  facingMode: string; // should be enums?
    static  language: string;
    static nickname: string;
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

    static save() {
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

  

    static load() {
        UserSettings.slugHistory = new SlugHistory();
        const ls = localStorage.getItem("settings");
        if (ls) {
            let settings = JSON.parse(ls);
            UserSettings.audioDeviceIn = settings.audioDeviceIn;
            UserSettings.audioDeviceOut = settings.audioDeviceOut;
            UserSettings.videoDevice = settings.videoDevice;
            UserSettings.videoResolution = settings.videoResolution;
            UserSettings.nickname = settings.nickname;
            UserSettings.slugHistory.history = settings.slugHistory;
            UserSettings.showQuickStart = settings.showQuickStart;
            UserSettings.language = settings.language || "";

        }
        else {
            UserSettings.slugHistory.history = new Array<string>();
            UserSettings.nickname = Math.random().toString(36).substring(8);
            UserSettings.audioDeviceIn = ""; 
            UserSettings.audioDeviceOut = ""; 
            UserSettings.videoDevice = "";
            UserSettings.videoResolution = "";
            UserSettings.showQuickStart = true;
            UserSettings.language = ""
        }
    }
}

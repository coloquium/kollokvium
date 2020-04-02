"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SlugHistory_1 = require("./SlugHistory");
const DetectResolutions_1 = require("./Helpers/DetectResolutions");
class UserSettings {
    constructor() {
        this.slugHistory = new SlugHistory_1.SlugHistory();
        const ls = localStorage.getItem("settings");
        if (ls) {
            let settings = JSON.parse(ls);
            this.audioDevice = settings.audioDevice;
            this.videoDevice = settings.videoDevice;
            this.videoResolution = settings.videoResolution;
            this.nickname = settings.nickname;
            this.slugHistory.history = settings.slugHistory;
        }
        else {
            this.slugHistory.history = new Array();
            this.nickname = Math.random().toString(36).substring(8);
            this.audioDevice = "";
            this.videoDevice = "";
            this.videoResolution = "";
        }
    }
    saveSetting() {
        const data = {
            slugHistory: this.slugHistory.history,
            videoDevice: this.videoDevice,
            audioDevice: this.audioDevice,
            videoResolution: this.videoResolution,
            nickname: this.nickname
        };
        localStorage.setItem("settings", JSON.stringify(data));
    }
    createConstraints(candidate) {
        let constraints;
        if (candidate.length === 0) {
            constraints = {
                video: {
                    width: { min: 640, ideal: 1920 },
                    height: { min: 400, ideal: 1080 }
                }, audio: true,
            };
        }
        else {
            const preferedResolution = DetectResolutions_1.DetectResolutions.getCandidate(candidate);
            constraints = {
                audio: true,
                video: {
                    width: { exact: preferedResolution.width },
                    height: { exact: preferedResolution.height }
                }
            };
        }
        ;
        if (this.audioDevice.length > 0) {
            constraints.video["deviceId"] = this.audioDevice;
        }
        if (this.videoDevice.length > 0) {
            constraints.video["deviceId"] = this.videoDevice;
        }
        console.log(constraints);
        return constraints;
    }
}
UserSettings.defaultConstraints = {
    video: {
        width: { min: 640, ideal: 1280 },
        height: { min: 400, ideal: 720 }
    }, audio: true,
};
exports.UserSettings = UserSettings;

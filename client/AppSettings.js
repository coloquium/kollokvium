"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SlugHistory_1 = require("./SlugHistory");
class AppSettings {
    saveSetting() {
        const data = {
            slugHistory: this.slugHistory.history,
            videoDevice: this.videoDevice,
            audioDevice: this.audioDevice,
            nickname: this.nickname
        };
        localStorage.setItem("settings", JSON.stringify(data));
    }
    createConstraints() {
        const constraints = {
            video: {
                width: { min: 640, ideal: 1280 },
                height: { min: 400, ideal: 720 }
            }, audio: true,
        };
        if (this.audioDevice.length > 0) {
            constraints.video["deviceId"] = this.audioDevice;
        }
        if (this.videoDevice.length > 0) {
            constraints.video["deviceId"] = this.videoDevice;
        }
        console.log(constraints);
        return constraints;
    }
    constructor() {
        this.slugHistory = new SlugHistory_1.SlugHistory();
        const ls = localStorage.getItem("settings");
        if (ls) {
            let settings = JSON.parse(ls);
            this.audioDevice = settings.audioDevice;
            this.videoDevice = settings.videoDevice;
            this.nickname = settings.nickname;
            this.slugHistory.history = settings.slugHistory;
        }
        else {
            this.slugHistory.history = new Array();
            this.nickname = Math.random().toString(36).substring(8);
            this.audioDevice = "";
            this.videoDevice = "";
        }
    }
}
exports.AppSettings = AppSettings;

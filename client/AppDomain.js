"use strict";
/**
 *  Class enebales customization of "Kollokvium" for personal / corperate usage
 *
 * @export
 * @class AppDomain
 */
Object.defineProperty(exports, "__esModule", { value: true });
const appConfig = require("./settings.json");
class AppDomain {
    getSlug(value) {
        return `${this.contextPrefix}-${value}`;
    }
    constructor() {
        this.host = appConfig.host;
        this.domain = appConfig.domain;
        this.contextPrefix = appConfig.contextPrefix;
        this.serverUrl = appConfig.serverUrl;
        this.version = appConfig.version;
    }
}
exports.AppDomain = AppDomain;

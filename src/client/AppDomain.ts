/**
 *  Class enables customization of "Kollokvium" for personal / corperate usage
 *
 * @export
 * @class AppDomain
 */

const appConfig = require("./settings.json");


export class AppDomain {
    version: string;
    serverUrl: string;
    domain: string;
    contextPrefix: string;
    host: string;
    getSlug(value: string): string {
        return `${this.contextPrefix}-${value}`;
    }
    getHost() {
        const port = location.port;
        const host = (appConfig.host || window.location.hostname)
        return location.protocol + "//" + host + (port.length > 0 ? ":" + port : "");
    }
    getServerUrl() {
        const port = location.port;
        const host = (appConfig.serverUrl || window.location.hostname);
        return location.protocol.includes("https:") ? "wss://" : "ws://" + host
            + (port.length > 0 ? ":" + port : "");
    }
    constructor() {
        this.host = this.getHost(); // location.protocol +"//" + (appConfig.host || window.location.hostname);
        this.domain = appConfig.domain;
        this.contextPrefix = appConfig.contextPrefix;
        this.serverUrl = this.getServerUrl()
        this.version = appConfig.version;
    }
}

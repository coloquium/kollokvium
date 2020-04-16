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
        const port = window.location.port;
        const host = (appConfig.host || window.location.hostname)
        let result =  location.protocol + "//" + host + (port.length > 0 ? ":" + port : "");
        return result;
    }
    getServerUrl() {
        const serverUrl = process.env.WSS_SERVER_URL || appConfig.serverUrl;

        if(serverUrl && serverUrl.includes("://")){
            return serverUrl;
        }
        const port = window.location.port;
        const host = (serverUrl || window.location.hostname);
        const scheme =  location.protocol.includes("https:") ? "wss://" : "ws://";
        let result =  scheme + host
            + (port.length > 0 ? ":" + port : "");
        return result;
    }
    constructor() {
        this.host = this.getHost(); // location.protocol +"//" + (appConfig.host || window.location.hostname);
        this.domain = appConfig.domain;
        this.contextPrefix = appConfig.contextPrefix;
        this.serverUrl = this.getServerUrl()
        this.version = process.env.KOLLOKVIUM_VERSION || appConfig.version;
    }
}

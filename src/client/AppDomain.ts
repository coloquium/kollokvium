/**
 *  Class enables customization of "Kollokvium".
 *
 * @export
 * @class AppDomain
 */

import { ILogger } from "./Helpers/ILogger";
import { AppLogger } from './Helpers/AppLogger';
import { Factory } from "thor-io.client-vnext";

const appConfig = require("./settings.json");
export class AppDomain {

    
    static logger: ILogger = new AppLogger(appConfig.logToConsole);

    static get version(): string {
        return process.env.KOLLOKVIUM_VERSION || appConfig.version
    };
    static get serverUrl(): string {
        return this.getServerUrl();
    };
    static get domain(): string {
        return appConfig.domain;
    };
    static get contextPrefix(): string {
        return appConfig.contextPrefix;
    };
    static get host(): string {
        return this.getHost();
    };
    static get translateKey(): string {
        return appConfig.translateKey || ""
    };

    static getSlug(value: string): string {
        return `${this.contextPrefix}-${value}`;
    }
    static get rtcConfig():RTCConfiguration{
        return appConfig.rtcConfig;
    }
    static getHost() {
        const port = window.location.port;
        const host = (appConfig.host || window.location.hostname)
        let result = location.protocol + "//" + host + (port.length > 0 ? ":" + port : "");
        return result;
    }
    static getServerUrl() {
        const serverUrl = process.env.WSS_SERVER_URL || appConfig.serverUrl;

        if (serverUrl && serverUrl.includes("://")) {
            return serverUrl;
        }
        const port = window.location.port;
        const host = (serverUrl || window.location.hostname);
        const scheme = location.protocol.includes("https:") ? "wss://" : "ws://";
        let result = scheme + host
            + (port.length > 0 ? ":" + port : "");
        return result;
    }

}

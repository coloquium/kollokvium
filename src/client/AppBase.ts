import { Factory, WebRTC, WebRTCConnection, Controller } from 'thor-io.client-vnext';
import { AppDomain } from './AppDomain';
import { E2EEBase } from './E2EE/EncodeDecode';
export class AppBase {
    factory: Factory;
    rtc: WebRTC;
    numReconnects: number = 0;
    onConnected: (connection: WebRTCConnection) => void;
    onDisconnected: (connection: WebRTCConnection) => void;
    onReady: (broker: Controller) => void;
    e2eeContext: any;

    get supportsE2EE(): boolean {
        return !!window["RTCRtpSender"].prototype["createEncodedStreams"];
    }

    getRTCStatsReport(): Promise<string[]> {
        let a = Array.from(this.rtc.peers.values()).map((conn: WebRTCConnection) => {
            return new Promise<string>((resolve, reject) => {
                conn.RTCPeer.getStats().then((stats: RTCStatsReport) => {
                    let statsOutput = "";
                    stats.forEach(report => {
                        statsOutput += `<h1>PeerID - ${conn.id}</h1><hr/>`
                        statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
                            `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
                        Object.keys(report).forEach(statName => {
                            if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
                                statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
                            }
                        });

                    });
                    resolve(statsOutput);
                }).catch(err => resolve(err));
            });
        });
        return Promise.all(a);
    }
    constructor() {
        AppDomain.logger.log(`Client supports E2EE`, this.supportsE2EE);
    }
    initialize(params?: any): Promise<Controller> {
        return new Promise<Controller>((resolve, reject) => {
            try {
                this.factory = new Factory(AppDomain.serverUrl, ["broker"], params || {});
                this.factory.onOpen = (broker: any) => {

                    if (this.supportsE2EE) {
                        this.e2eeContext = new E2EEBase(performance.now().toString());
                        this.rtc = new WebRTC(broker, AppDomain.rtcConfig, this.e2eeContext);

                    } else this.rtc = new WebRTC(broker, AppDomain.rtcConfig);

                    this.rtc.isEncrypted = false;

                    AppDomain.logger.log("RTC is running e2ee state", this.rtc.isEncrypted);

                    resolve(broker);
                }
            } catch (err) {
                AppDomain.logger.error("Failed to initialize", err);
                reject(err);
            }
        });
    }
}

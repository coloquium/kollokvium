import { Factory, WebRTC, WebRTCConnection, Controller } from 'thor-io.client-vnext';
import { AppDomain } from './AppDomain';
import { AppLogger } from './Helpers/AppLogger';
export class AppBase {

    factory: Factory;
    rtc: WebRTC;
    numReconnects: number = 0;

    onConnected: (connection: WebRTCConnection) => void;
    onDisconnected: (connection: WebRTCConnection) => void;
    onReady: (broker: Controller) => void;


    getRTCStatsReport(): Promise<string[]> {


        let a = Array.from(this.rtc.Peers.values()).map((conn: WebRTCConnection) => {

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
    }
    initialize(params?: any): Promise<Controller> {
        return new Promise<Controller>((resolve, reject) => {


            try {
                this.factory = new Factory(AppDomain.serverUrl, ["broker"], params || {});
                this.factory.OnOpen = (broker: any) => {
                    this.rtc = new WebRTC(broker, AppDomain.rtcConfig);
                    resolve(broker);
                }
            } catch (err) {
                AppDomain.logger.error("Failed to initialize", err);
                reject(err);
            }


        });
    }

}

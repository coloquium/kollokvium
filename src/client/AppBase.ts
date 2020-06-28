import { Factory, WebRTC, WebRTCConnection, Controller } from 'thor-io.client-vnext';
import { AppDomain } from './AppDomain';
export class AppBase {

    factory: Factory;
    rtc: WebRTC;
    numReconnects: number = 0;

    onConnected: (connection: WebRTCConnection) => void;
    onDisconnected: (connection: WebRTCConnection) => void;
    onReady: (broker: Controller) => void;


    constructor() {
    }
    initialize(params?:any): Promise<Controller> {
        return new Promise<Controller>((resolve, reject) => {

            
            try {
                this.factory = new Factory(AppDomain.serverUrl, ["broker"], params || {});
                this.factory.OnOpen = (broker: any) => {
                    this.rtc = new WebRTC(broker, AppDomain.rtcConfig);
                    resolve(broker);
                }
            } catch (err) {
                AppDomain.logger.error("failed to initialize", err);
                reject(err);
            }


        });
    }

}

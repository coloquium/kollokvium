import { Factory, WebRTC, WebRTCConnection, Controller } from 'thor-io.client-vnext';
import { AppDomain } from './AppDomain';
export class AppBase {
    
    factory: Factory;
    rtc: WebRTC;

    onConnected: (connection:WebRTCConnection) =>void;
    onDisconnected: (connection:WebRTCConnection) => void;
    onInitialized:(broker:Controller)=>void;
    
   private createFactory(url: string, config: any): Factory {
        return new Factory(url, ["broker"]);
    }
    constructor() {      
    }
    initialize():Promise<Controller>{
        return  new Promise<Controller>( (resolve,reject) => {
            this.factory = this.createFactory(AppDomain.serverUrl, {});
            this.factory.OnOpen = (broker:any) => {
                this.rtc = new WebRTC(broker, AppDomain.rtcConfig);
                resolve(broker);
            } 
            this.factory.OnClose = (reason: any) => {
                reject(reason);
                AppDomain.logger.error("factory closed", reason);
            };
        });        
    }
   
}

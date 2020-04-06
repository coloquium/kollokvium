/**
 *  Class enebales customization of "Kollokvium" for personal / corperate usage
 *
 * @export
 * @class AppDomain
 */

 const appConfig = require("./settings.json");


 export class AppDomain {
    host: any;
    getSlug(value: string): string {
     return `${this.contextPrefix}-${value}`;
    }
    version:string;
    serverUrl: string;
    domain:string;
    contextPrefix:string;
    constructor(){
    
        this.host = appConfig.host;
        this.domain = appConfig.domain;
        this.contextPrefix = appConfig.contextPrefix;
        this.serverUrl = appConfig.serverUrl;
        this.version = appConfig.version;
       
    }
}

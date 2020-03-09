import {
    
    ControllerProperties,
    CanInvoke,
    CanSet,
    BrokerController,
    Connection
} from 'thor-io.vnext'

// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 2 seconds to keep alive. 
@ControllerProperties("broker", false, 2*1000)
export class Broker extends  BrokerController {
    constructor(connection: Connection) {
        super(connection);
    }
    @CanInvoke(true)
    fileShare(fileInfo: any, topic: any, controller: any, blob: any) {
        let expression = (pre: BrokerController) => {
            return pre.Peer.context >= this.Peer.context; 
        };
        this.invokeTo(expression,{text:"File shared (see '" + fileInfo.name + "')",from:'Kollokvium'}, "instantMessage", this.alias);   
        this.invokeTo(expression,fileInfo, "fileShare", this.alias, blob);
    }
}
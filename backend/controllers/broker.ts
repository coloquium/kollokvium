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
    // extend 'broker' with a custom method 'foo' -> client calls "foo" and controller (broker) passes data to all in "bar"
    // @CanInvoke(true)  // use decorators to make methods public to client.
    // foo(data:any){
    //     this.invokeToAll(data,"bar");
    // }

    // // this property can be set from client, by calling set property, and then be use to filter clients based  on it state (property)
    // @CanSet(true)
    // age:numberz

    @CanInvoke(true)
    fileShare(fileInfo: any, topic: any, controller: any, blob: any) {
        var expression = (pre: BrokerController) => {
            return pre.Peer.context >= this.Peer.context;
        };
        this.invokeTo(expression,{text:"File shared (see '" + fileInfo.name + "')",from:'Kollokvium'}, "instantMessage", this.alias);   
        this.invokeTo(expression,fileInfo, "fileShare", this.alias, blob);
    }


}
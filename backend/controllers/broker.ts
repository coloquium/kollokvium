import {
    ControllerProperties,
    CanInvoke,
    CanSet,
    BrokerController,
    Connection
} from 'thor-io.vnext'
import { ChatMessageModel } from '../Models/ChatMessageModel';
import { DungeonModel } from '../Models/DungeonModel';



// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 5 seconds to keep alive. 
@ControllerProperties("broker", false, 5 * 1000)
export class Broker extends BrokerController {


    nickName: string

    /**
     *Creates an instance of Broker.
     * @param {Connection} connection
     * @memberof Broker
     */
    constructor(connection: Connection) {
        super(connection);
    }
    /**
     *
     *
     * @param {*} fileInfo
     * @param {*} topic
     * @param {*} controller
     * @param {*} blob
     * @memberof Broker
     */
    @CanInvoke(true)
    fileShare(fileInfo: any, topic: any, controller: any, blob: any) {
        let expression = (pre: Broker) => {
            return pre.Peer.context >= this.Peer.context;
        };
        this.invokeTo(expression, { text: "File shared (see '" + fileInfo.name + "')", from: 'Kollokvium' }, "instantMessage", this.alias);
        this.invokeTo(expression, fileInfo, "fileShare", this.alias, blob);
    }


    @CanInvoke(true)
    setNickname(name: string) {
        this.nickName = name;
    }

    /**
     * Send chat messages 
     *
     * @param {*} data
     * @param {string} topic
     * @param {string} controller
     * @memberof Broker
     */
    @CanInvoke(true)
    chatMessage(data: ChatMessageModel, topic: string, controller: string) {
        let expression;
        let mentions = data.text.match(/\B@[a-z0-9_-]+/gi) as Array<string>;

        // has mentions, then targt only thoose ..
        if (!mentions) {
            data.hasMentions = false;
            expression = (pre: Broker) => {
                return pre.Peer.context == this.Peer.context;
            };
        } else {
            data.hasMentions = true;

            // Make sure i also get it, push self
            mentions.push(this.nickName);

            expression = (pre: Broker) => {
                return pre.Peer.context == this.Peer.context && mentions.includes(`${pre.nickName}`);
            };
        }
        this.invokeTo(expression, data, "chatMessage");
    }


    @CanInvoke(true)
    leaveDungeon(data: any) {
   
        console.log("leaveDungeon",data);
        this.invokeTo((pre: BrokerController) => {
            return pre.Peer.peerId == data.peerId;
        }, {
            key:data.key,
            peerId: this.Peer.peerId
        }, "leaveDungeon");

    }


    /**
     *
     *
     * @param {string} peerId
     * @memberof Broker
     */
    @CanInvoke(true)
    inviteDungeon(dungeon: DungeonModel) {
        dungeon.creator = this.Peer.peerId;
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: BrokerController) => {
                return pre.Peer.peerId == peerId;
            }, dungeon, "inviteDungeon");
        });
    }
    /**
     *
     *
     * @param {string} peerId
     * @memberof Broker
     */
    @CanInvoke(true)
    declineDungeon(dungeon: DungeonModel) {
   
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: BrokerController) => {
                return pre.Peer.peerId == peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "declineDungeon");
        });

          // notify creator as well i declined

          this.invokeTo((pre: BrokerController) => {
            return pre.Peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.Peer.peerId
        }, "declineDungeon");


    }
    /**
     *
     *
     * @param {string} peerId
     * @memberof Broker
     */
    @CanInvoke(true)
    acceptDungeon(dungeon: DungeonModel) {

        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: BrokerController) => {
                return pre.Peer.peerId == peerId && pre.Peer.peerId !== this.Peer.peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "acceptDungeon");
        });

        // notify creator as well i accepted

        this.invokeTo((pre: BrokerController) => {
            return pre.Peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.Peer.peerId
        }, "acceptDungeon");

    }

}
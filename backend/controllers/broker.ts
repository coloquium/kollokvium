import {
    ControllerProperties,
    CanInvoke,
    CanSet,
    Connection,
    ControllerBase,
    Signal,
} from 'thor-io.vnext'
import { ChatMessageModel } from '../Models/ChatMessageModel';
import { DungeonModel } from '../Models/DungeonModel';
import { ExtendedPeerConnection } from '../Models/ExtendedPeerConnection';


// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 5 seconds to keep alive. 
@ControllerProperties("broker", false, 5 * 1000)

export class Broker extends ControllerBase {


    public Peer: ExtendedPeerConnection;
    public localPeerId: string;


    nickName: string;
    Connections: Array<ExtendedPeerConnection>;

    /**
     *Creates an instance of Broker.
     * @param {Connection} connection
     * @memberof Broker
     */
    constructor(connection: Connection) {
        super(connection);
        this.Connections = new Array<ExtendedPeerConnection>();
    }

    @CanInvoke(true)
    lockContext() {

        this.Peer.locked = !this.Peer.locked;
        this.getExtendedPeerConnections(this.Peer).forEach((c: Broker) => {
            c.Peer.locked = this.Peer.locked;
        });
        let expression = (pre: Broker) => {
            return pre.Peer.context == this.Peer.context;
        };
        this.invokeTo(expression, this.Peer, "lockContext", this.alias);



    }

    @CanInvoke(true)
    isRoomLocked(slug: string) {

   /**
     *
     *
     * @param {string} peerId
     * @memberof Broker
     */
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.Peer.context === slug && pre.Peer.locked === true;
        });





        this.invoke({ "state": match.length > 0 ? true : false }, "isRoomLocked");



    }


    onopen() {
        this.Peer = new ExtendedPeerConnection(ControllerBase.newGuid(), this.connection.id);
        this.invoke(this.Peer, "contextCreated", this.alias);
    }
    @CanInvoke(true)
    changeContext(change: ExtendedPeerConnection) {

        let match = this.getExtendedPeerConnections(this.Peer).find((c: Broker) => {
            c.Peer.locked == false && c.Peer.context == change.context;
        });

        if (!match) {
            this.Peer.context = change.context;
            this.invoke(this.Peer, "contextChanged", this.alias);
        } else {
            this.invoke(this.Peer, "contextChangedFailure", this.alias);
        }



    }

  
    @CanInvoke(true)
    contextSignal(signal: Signal) {
    
        let expression = (pre: Broker) => {
            return pre.connection.id === signal.recipient;
        };
        this.invokeTo(expression, signal, "contextSignal", this.alias);
    }
 
    @CanInvoke(true)
    connectContext() {
        /**
         *
         *
         * @param {Broker} p
         * @returns
         */
        if (!this.Peer.locked) {
            let connections = this.getExtendedPeerConnections(this.Peer).map((p: Broker) => {
                return p.Peer;
            });
            this.invoke(connections, "connectTo", this.alias);
        }
    }
   
    getExtendedPeerConnections(peerConnetion: ExtendedPeerConnection): Array<ControllerBase> {
    
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.Peer.context === this.Peer.context && pre.Peer.peerId !== peerConnetion.peerId;
        });
        return match;
    }

  
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


        this.invokeTo((pre: Broker) => {
            return pre.Peer.peerId == data.peerId;
        }, {
            key: data.key,
            peerId: this.Peer.peerId
        }, "leaveDungeon");

    }


    
    @CanInvoke(true)
    inviteDungeon(dungeon: DungeonModel) {
        dungeon.creator = this.Peer.peerId;
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: Broker) => {
                return pre.Peer.peerId == peerId;
            }, dungeon, "inviteDungeon");
        });
    }
 
    @CanInvoke(true)
    declineDungeon(dungeon: DungeonModel) {

        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: Broker) => {
                return pre.Peer.peerId == peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "declineDungeon");
        });

        // notify creator as well i declined

        this.invokeTo((pre: Broker) => {
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
            this.invokeTo((pre: Broker) => {
                return pre.Peer.peerId == peerId && pre.Peer.peerId !== this.Peer.peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "acceptDungeon");
        });

        // notify creator as well i accepted

        this.invokeTo((pre: Broker) => {
            return pre.Peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.Peer.peerId
        }, "acceptDungeon");

    }

}
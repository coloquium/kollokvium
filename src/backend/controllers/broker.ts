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
import { Utils } from 'thor-io.client-vnext';

@ControllerProperties("broker", false, 5 * 1000)
export class Broker extends ControllerBase {

    peer: ExtendedPeerConnection;
    localPeerId: string;
    nickname: string;
    connections: Array<ExtendedPeerConnection>;
    constructor(connection: Connection) {
        super(connection);
        this.connections = new Array<ExtendedPeerConnection>();
    }

    @CanInvoke(true)
    lockContext() {
        this.peer.locked = !this.peer.locked;
        this.getExtendedPeerConnections(this.peer).forEach((c: Broker) => {
            c.peer.locked = this.peer.locked;
        });
        let expression = (pre: Broker) => {
            return pre.peer.context == this.peer.context;
        };
        this.invokeTo(expression, this.peer, "lockContext", this.alias);
    }

    @CanInvoke(true)
    isRoomLocked(slug: string) {
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.peer.context === slug && pre.peer.locked === true;
        });
        this.invoke({ "state": match.length > 0 ? true : false }, "isRoomLocked");

    }
    onopen() {
        this.peer = new ExtendedPeerConnection(Utils.newGuid(), this.connection.id);
        this.invoke(this.peer, "contextCreated", this.alias);

        setInterval(() => {
            this.invoke({ts:Date.now()},"ping");
        },15*1000);;

    }

    @CanInvoke(true)
    leaveContext() {     
        this.peer = new ExtendedPeerConnection(Utils.newGuid(), this.connection.id);
        this.invoke(this.peer, "leaveContext", this.alias);

    }

    @CanInvoke(true)
    changeContext(change: ExtendedPeerConnection) {
        let match = this.getExtendedPeerConnections(this.peer).find((pre: Broker) => {
            return pre.peer.locked == false && pre.peer.context == change.context;
        });

        if (!match) {
            this.peer.context = change.context;
            this.invoke(this.peer, "contextChanged", this.alias);
        } else {
            this.invoke(this.peer, "contextChangedFailure", this.alias);
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
        if (!this.peer.locked) {
            let connections = this.getExtendedPeerConnections(this.peer).map((p: Broker) => {
                return p.peer;
            });
            this.invoke(connections, "connectTo", this.alias);
        }
    }
    getExtendedPeerConnections(peerConnetion: ExtendedPeerConnection): Array<ControllerBase> {
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.peer.context === this.peer.context && pre.peer.peerId !== peerConnetion.peerId;
        });
        return match;
    }
    @CanInvoke(true)
    fileShare(fileInfo: any, topic: any, controller: any, blob: any) {
        let expression = (pre: Broker) => {
            return pre.peer.context >= this.peer.context;        };
        this.invokeTo(expression, { text: "You recived a file (see '" + fileInfo.name + "')", from: 'Kollokvium' }, "chatMessage", this.alias);
        this.invokeTo(expression, fileInfo, "fileShare", this.alias, blob);
    }
    @CanInvoke(true)
    setNickname(name: string) {
        this.nickname = name;
    }

    /**
     *  Not used as we use dataChannels for the text chat
     *
     * @param {ChatMessageModel} data
     * @param {string} topic
     * @param {string} controller
     * @memberof Broker
     */
    @CanInvoke(true)
    chatMessage(data: ChatMessageModel, topic: string, controller: string) {        
        return;
        let expression;
        let mentions = data.text.match(/\B@[a-z0-9_-]+/gi) as Array<string>;
        // has mentions, then target only thoose ..
        if (!mentions) {
            data.hasMentions = false;
            expression = (pre: Broker) => {
                return pre.peer.context == this.peer.context;
            };
        } else {
            data.hasMentions = true;
            // Make sure i also get it, push self
            mentions.push(this.nickname);
            expression = (pre: Broker) => {
                return pre.peer.context == this.peer.context && mentions.includes(`${pre.nickname}`);
            };
        }
        this.invokeTo(expression, data, "chatMessage");
    }
    @CanInvoke(true)
    leaveDungeon(data: any) {
        this.invokeTo((pre: Broker) => {
            return pre.peer.peerId == data.peerId;
        }, {
            key: data.key,
            peerId: this.peer.peerId
        }, "leaveDungeon");
    }
    @CanInvoke(true)
    inviteDungeon(dungeon: DungeonModel) {
        dungeon.creator = this.peer.peerId;
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: Broker) => {
                return pre.peer.peerId == peerId;
            }, dungeon, "inviteDungeon");
        });
    }
    @CanInvoke(true)
    declineDungeon(dungeon: DungeonModel) {
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: Broker) => {
                return pre.peer.peerId == peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.peer.peerId
            }, "declineDungeon");
        });
        // notify creator as well i declined
        this.invokeTo((pre: Broker) => {
            return pre.peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.peer.peerId
        }, "declineDungeon");
    }
    @CanInvoke(true)
    acceptDungeon(dungeon: DungeonModel) {
        dungeon.peerIds.forEach((peerId: string) => {
            this.invokeTo((pre: Broker) => {
                return pre.peer.peerId == peerId && pre.peer.peerId !== this.peer.peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.peer.peerId
            }, "acceptDungeon");
        });
        // notify creator as well i accepted
        this.invokeTo((pre: Broker) => {
            return pre.peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.peer.peerId
        }, "acceptDungeon");
    }

    @CanInvoke(true)
    isAlive() {
        this.invoke({ timestamp: Date.now() }, "isAlive");
    }
}
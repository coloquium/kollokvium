import {
    ControllerProperties,
    CanInvoke,
    Connection,
    ControllerBase,
    Signal,
} from 'thor-io.vnext'

import { ExtendedPeerConnection } from '../Models/ExtendedPeerConnection';
import { Utils } from 'thor-io.client-vnext';
import { defaultClient as appInsightsClient } from 'applicationinsights';

@ControllerProperties("broker", false, 5 * 1000)
export class Broker extends ControllerBase {

    peer: ExtendedPeerConnection;
    // localPeerId: string;
    nickname: string;
    isOrganizer: boolean;
    connections: Array<ExtendedPeerConnection>;
    constructor(connection: Connection) {
        super(connection);
        this.connections = new Array<ExtendedPeerConnection>();
    }
    onopen() {
        this.peer = new ExtendedPeerConnection(Utils.newGuid(), this.connection.id);
        this.invoke(this.peer, "contextCreated", this.alias);
        appInsightsClient && appInsightsClient.trackTrace({ message: "contextCreated" });
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
        appInsightsClient && appInsightsClient.trackTrace({ message: "lockContext" });
    }
    @CanInvoke(true)
    isRoomLocked(slug: string) {
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.peer.context === slug && pre.peer.locked === true;
        });
        this.invoke({ "state": match.length > 0 ? true : false }, "isRoomLocked");
        appInsightsClient && appInsightsClient.trackTrace({ message: "isRoomLocked" });
    }
    @CanInvoke(true)
    leaveContext() {
        this.peer = new ExtendedPeerConnection(Utils.newGuid(), this.connection.id);
        this.invoke(this.peer, "leaveContext", this.alias);
        appInsightsClient && appInsightsClient.trackTrace({ message: "leaveContext" });
    }
    @CanInvoke(true)
    changeContext(change: { context: string, audio?: boolean, video?: boolean }) {
        let match = this.getExtendedPeerConnections(this.peer).find((pre: Broker) => {
            return pre.peer.locked == false && pre.peer.context == change.context;
        });

        if (!match) {

            const isOrganizer = this.findOn(this.alias, (pre: Broker) => {
                return pre.peer.context === change.context && pre.isOrganizer == true;
            }).length == 0 ? true : false;
            this.peer.context = change.context;
            this.peer.audio = change.audio;
            this.peer.video = change.video;
            this.isOrganizer = isOrganizer;
            this.invoke(this.peer, "contextChanged", this.alias);
            appInsightsClient && appInsightsClient.trackTrace({ message: "contextChanged" });
        } else {
            this.invoke(this.peer, "contextChangedFailure", this.alias);
            appInsightsClient && appInsightsClient.trackTrace({ message: "contextChangedFailure" });
        }
    }
    @CanInvoke(true)
    contextSignal(signal: Signal) {
        let expression = (pre: Broker) => {
            return pre.connection.id === signal.recipient;
        };
        this.invokeTo(expression, signal, "contextSignal", this.alias);
        appInsightsClient && appInsightsClient.trackTrace({ message: "contextSignal" });
    }
    @CanInvoke(true)
    connectContext() {
        if (!this.peer.locked) {
            let connections = this.getExtendedPeerConnections(this.peer).map((p: Broker) => {
                return p.peer;
            });
            this.invoke(connections, "connectTo", this.alias);
            appInsightsClient && appInsightsClient.trackTrace({ message: "connectTo" });
        }
    }
    @CanInvoke(true)
    setNickname(name: string) {
        this.nickname = name;
        this.invokeTo((pre: Broker) => {
            return pre.peer.context == this.peer.context;
        },
            {
                nickname: this.nickname, peerId: this.peer.peerId
            }, "nicknameChange")
    }
    @CanInvoke(true)
    onliners() {
        let onliners = this.getOnliners();
        onliners.push(
            {
                peerId: this.peer.peerId, nickname: this.nickname, created: this.peer.created,
                organizer: this.isOrganizer
            }
        ); // self also..
        this.invoke(onliners, "onliners");
        appInsightsClient && appInsightsClient.trackTrace({ message: "onliners" });
    }
    @CanInvoke(true) 
    ping(ts:number){
        this.invoke({ ts: ts  }, "pong");
    }    
    @CanInvoke(true)
    isAlive() {
        this.invoke({ timestamp: Date.now() }, "isAlive");
        appInsightsClient && appInsightsClient.trackMetric({
            name: 'context',
            value: this.connections.length
        });
        appInsightsClient && appInsightsClient.trackTrace({ message: "isAlive" });
    }

    @CanInvoke(true)
    whois(peerId: string) {

        const match = this.getOnliners().find((pre) => {
            return pre.peerId === peerId;
        })
        if (match) {
            this.invoke(match, "whois");
        }
    }


    getOnliners(): Array<any> {
        return this.getExtendedPeerConnections(this.peer).map((p: Broker) => {
            return {
                peerId: p.peer.peerId, nickname: p.nickname, created: p.peer.created,
                organizer: p.isOrganizer
            };
        });
    }


    getExtendedPeerConnections(peerConnetion: ExtendedPeerConnection): Array<ControllerBase> {
        let match = this.findOn(this.alias, (pre: Broker) => {
            return pre.peer.context === this.peer.context && pre.peer.peerId !== peerConnetion.peerId;
        });
        return match;
    }

}
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_vnext_1 = require("thor-io.vnext");
const ChatMessageModel_1 = require("../Models/ChatMessageModel");
const DungeonModel_1 = require("../Models/DungeonModel");
const ExtendedPeerConnection_1 = require("../Models/ExtendedPeerConnection");
// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 5 seconds to keep alive. 
let Broker = class Broker extends thor_io_vnext_1.ControllerBase {
    /**
     *Creates an instance of Broker.
     * @param {Connection} connection
     * @memberof Broker
     */
    constructor(connection) {
        super(connection);
        this.Connections = new Array();
    }
    lockContext() {
        this.Peer.locked = !this.Peer.locked;
        this.getExtendedPeerConnections(this.Peer).forEach((c) => {
            c.Peer.locked = this.Peer.locked;
        });
        let expression = (pre) => {
            return pre.Peer.context == this.Peer.context;
        };
        this.invokeTo(expression, this.Peer, "lockContext", this.alias);
    }
    isRoomLocked(slug) {
        /**
          *
          *
          * @param {string} peerId
          * @memberof Broker
          */
        let match = this.findOn(this.alias, (pre) => {
            return pre.Peer.context === slug && pre.Peer.locked === true;
        });
        this.invoke({ "state": match.length > 0 ? true : false }, "isRoomLocked");
    }
    onopen() {
        this.Peer = new ExtendedPeerConnection_1.ExtendedPeerConnection(thor_io_vnext_1.ControllerBase.newGuid(), this.connection.id);
        this.invoke(this.Peer, "contextCreated", this.alias);
    }
    changeContext(change) {
        let match = this.getExtendedPeerConnections(this.Peer).find((c) => {
            c.Peer.locked == false && c.Peer.context == change.context;
        });
        if (!match) {
            this.Peer.context = change.context;
            this.invoke(this.Peer, "contextChanged", this.alias);
        }
        else {
            this.invoke(this.Peer, "contextChangedFailure", this.alias);
        }
    }
    contextSignal(signal) {
        let expression = (pre) => {
            return pre.connection.id === signal.recipient;
        };
        this.invokeTo(expression, signal, "contextSignal", this.alias);
    }
    connectContext() {
        /**
         *
         *
         * @param {Broker} p
         * @returns
         */
        if (!this.Peer.locked) {
            let connections = this.getExtendedPeerConnections(this.Peer).map((p) => {
                return p.Peer;
            });
            this.invoke(connections, "connectTo", this.alias);
        }
    }
    getExtendedPeerConnections(peerConnetion) {
        let match = this.findOn(this.alias, (pre) => {
            return pre.Peer.context === this.Peer.context && pre.Peer.peerId !== peerConnetion.peerId;
        });
        return match;
    }
    fileShare(fileInfo, topic, controller, blob) {
        let expression = (pre) => {
            return pre.Peer.context >= this.Peer.context;
        };
        this.invokeTo(expression, { text: "File shared (see '" + fileInfo.name + "')", from: 'Kollokvium' }, "instantMessage", this.alias);
        this.invokeTo(expression, fileInfo, "fileShare", this.alias, blob);
    }
    setNickname(name) {
        this.nickName = name;
    }
    chatMessage(data, topic, controller) {
        let expression;
        let mentions = data.text.match(/\B@[a-z0-9_-]+/gi);
        // has mentions, then targt only thoose ..
        if (!mentions) {
            data.hasMentions = false;
            expression = (pre) => {
                return pre.Peer.context == this.Peer.context;
            };
        }
        else {
            data.hasMentions = true;
            // Make sure i also get it, push self
            mentions.push(this.nickName);
            expression = (pre) => {
                return pre.Peer.context == this.Peer.context && mentions.includes(`${pre.nickName}`);
            };
        }
        this.invokeTo(expression, data, "chatMessage");
    }
    leaveDungeon(data) {
        this.invokeTo((pre) => {
            return pre.Peer.peerId == data.peerId;
        }, {
            key: data.key,
            peerId: this.Peer.peerId
        }, "leaveDungeon");
    }
    inviteDungeon(dungeon) {
        dungeon.creator = this.Peer.peerId;
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.Peer.peerId == peerId;
            }, dungeon, "inviteDungeon");
        });
    }
    declineDungeon(dungeon) {
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.Peer.peerId == peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "declineDungeon");
        });
        // notify creator as well i declined
        this.invokeTo((pre) => {
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
    acceptDungeon(dungeon) {
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.Peer.peerId == peerId && pre.Peer.peerId !== this.Peer.peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.Peer.peerId
            }, "acceptDungeon");
        });
        // notify creator as well i accepted
        this.invokeTo((pre) => {
            return pre.Peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.Peer.peerId
        }, "acceptDungeon");
    }
};
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Broker.prototype, "lockContext", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "isRoomLocked", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExtendedPeerConnection_1.ExtendedPeerConnection]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "changeContext", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [thor_io_vnext_1.Signal]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "contextSignal", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Broker.prototype, "connectContext", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "fileShare", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "setNickname", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatMessageModel_1.ChatMessageModel, String, String]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "chatMessage", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "leaveDungeon", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DungeonModel_1.DungeonModel]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "inviteDungeon", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DungeonModel_1.DungeonModel]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "declineDungeon", null);
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DungeonModel_1.DungeonModel]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "acceptDungeon", null);
Broker = __decorate([
    thor_io_vnext_1.ControllerProperties("broker", false, 5 * 1000),
    __metadata("design:paramtypes", [thor_io_vnext_1.Connection])
], Broker);
exports.Broker = Broker;

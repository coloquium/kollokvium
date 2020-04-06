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
let Broker = class Broker extends thor_io_vnext_1.ControllerBase {
    constructor(connection) {
        super(connection);
        this.connections = new Array();
    }
    lockContext() {
        this.peer.locked = !this.peer.locked;
        this.getExtendedPeerConnections(this.peer).forEach((c) => {
            c.peer.locked = this.peer.locked;
        });
        let expression = (pre) => {
            return pre.peer.context == this.peer.context;
        };
        this.invokeTo(expression, this.peer, "lockContext", this.alias);
    }
    isRoomLocked(slug) {
        let match = this.findOn(this.alias, (pre) => {
            return pre.peer.context === slug && pre.peer.locked === true;
        });
        this.invoke({ "state": match.length > 0 ? true : false }, "isRoomLocked");
    }
    onopen() {
        this.peer = new ExtendedPeerConnection_1.ExtendedPeerConnection(thor_io_vnext_1.ControllerBase.newGuid(), this.connection.id);
        this.invoke(this.peer, "contextCreated", this.alias);
    }
    changeContext(change) {
        let match = this.getExtendedPeerConnections(this.peer).find((pre) => {
            return pre.peer.locked == false && pre.peer.context == change.context;
        });
        if (!match) {
            this.peer.context = change.context;
            this.invoke(this.peer, "contextChanged", this.alias);
        }
        else {
            this.invoke(this.peer, "contextChangedFailure", this.alias);
        }
    }
    contextSignal(signal) {
        let expression = (pre) => {
            return pre.connection.id === signal.recipient;
        };
        this.invokeTo(expression, signal, "contextSignal", this.alias);
    }
    connectContext() {
        if (!this.peer.locked) {
            let connections = this.getExtendedPeerConnections(this.peer).map((p) => {
                return p.peer;
            });
            this.invoke(connections, "connectTo", this.alias);
        }
    }
    getExtendedPeerConnections(peerConnetion) {
        let match = this.findOn(this.alias, (pre) => {
            return pre.peer.context === this.peer.context && pre.peer.peerId !== peerConnetion.peerId;
        });
        return match;
    }
    fileShare(fileInfo, topic, controller, blob) {
        let expression = (pre) => {
            return pre.peer.context >= this.peer.context;
        };
        this.invokeTo(expression, { text: "You recived a file (see '" + fileInfo.name + "')", from: 'Kollokvium' }, "chatMessage", this.alias);
        this.invokeTo(expression, fileInfo, "fileShare", this.alias, blob);
    }
    setNickname(name) {
        this.nickname = name;
    }
    chatMessage(data, topic, controller) {
        let expression;
        let mentions = data.text.match(/\B@[a-z0-9_-]+/gi);
        // has mentions, then target only thoose ..
        if (!mentions) {
            data.hasMentions = false;
            expression = (pre) => {
                return pre.peer.context == this.peer.context;
            };
        }
        else {
            data.hasMentions = true;
            // Make sure i also get it, push self
            mentions.push(this.nickname);
            expression = (pre) => {
                return pre.peer.context == this.peer.context && mentions.includes(`${pre.nickname}`);
            };
        }
        this.invokeTo(expression, data, "chatMessage");
    }
    leaveDungeon(data) {
        this.invokeTo((pre) => {
            return pre.peer.peerId == data.peerId;
        }, {
            key: data.key,
            peerId: this.peer.peerId
        }, "leaveDungeon");
    }
    inviteDungeon(dungeon) {
        dungeon.creator = this.peer.peerId;
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.peer.peerId == peerId;
            }, dungeon, "inviteDungeon");
        });
    }
    declineDungeon(dungeon) {
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.peer.peerId == peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.peer.peerId
            }, "declineDungeon");
        });
        // notify creator as well i declined
        this.invokeTo((pre) => {
            return pre.peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.peer.peerId
        }, "declineDungeon");
    }
    acceptDungeon(dungeon) {
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
                return pre.peer.peerId == peerId && pre.peer.peerId !== this.peer.peerId;
            }, {
                key: dungeon.key,
                context: dungeon.context,
                peerId: this.peer.peerId
            }, "acceptDungeon");
        });
        // notify creator as well i accepted
        this.invokeTo((pre) => {
            return pre.peer.peerId == dungeon.creator;
        }, {
            key: dungeon.key,
            context: dungeon.context,
            peerId: this.peer.peerId
        }, "acceptDungeon");
    }
    isAlive() {
        this.invoke({ timestamp: Date.now() }, "isAlive");
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
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Broker.prototype, "isAlive", null);
Broker = __decorate([
    thor_io_vnext_1.ControllerProperties("broker", false, 5 * 1000),
    __metadata("design:paramtypes", [thor_io_vnext_1.Connection])
], Broker);
exports.Broker = Broker;

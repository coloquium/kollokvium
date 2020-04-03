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
// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 5 seconds to keep alive. 
let Broker = class Broker extends thor_io_vnext_1.BrokerController {
    /**
     *Creates an instance of Broker.
     * @param {Connection} connection
     * @memberof Broker
     */
    constructor(connection) {
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
    /**
     * Send chat messages
     *
     * @param {*} data
     * @param {string} topic
     * @param {string} controller
     * @memberof Broker
     */
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
        console.log("leaveDungeon", data);
        this.invokeTo((pre) => {
            return pre.Peer.peerId == data.peerId;
        }, {
            key: data.key,
            peerId: this.Peer.peerId
        }, "leaveDungeon");
    }
    /**
     *
     *
     * @param {string} peerId
     * @memberof Broker
     */
    inviteDungeon(dungeon) {
        dungeon.creator = this.Peer.peerId;
        dungeon.peerIds.forEach((peerId) => {
            this.invokeTo((pre) => {
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

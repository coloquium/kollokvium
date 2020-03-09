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
// Controller will be know as "broker", and not seald ( seald = true, is background sevices),
// controller (broker) will pass a heartbeat to client each 2 seconds to keep alive. 
let Broker = class Broker extends thor_io_vnext_1.BrokerController {
    constructor(connection) {
        super(connection);
    }
    fileShare(fileInfo, topic, controller, blob) {
        let expression = (pre) => {
            return pre.Peer.context >= this.Peer.context;
        };
        this.invokeTo(expression, { text: "File shared (see '" + fileInfo.name + "')", from: 'Kollokvium' }, "instantMessage", this.alias);
        this.invokeTo(expression, fileInfo, "fileShare", this.alias, blob);
    }
};
__decorate([
    thor_io_vnext_1.CanInvoke(true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], Broker.prototype, "fileShare", null);
Broker = __decorate([
    thor_io_vnext_1.ControllerProperties("broker", false, 2 * 1000),
    __metadata("design:paramtypes", [thor_io_vnext_1.Connection])
], Broker);
exports.Broker = Broker;

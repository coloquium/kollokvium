"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let express = require("express");
let app = express();
const thor_io_vnext_1 = require("thor-io.vnext");
const broker_1 = require("./controllers/broker");
let thorIO = new thor_io_vnext_1.ThorIO.Engine([
    broker_1.Broker,
]);
var expressWs = require("express-ws")(app);
app.use("/", express.static("."));
app.ws("/", function (ws, req) {
    thorIO.addWebSocket(ws, req);
});
var port = process.env.PORT || 1337;
app.listen(port);
console.log("thor-io is serving on ", port.toString());

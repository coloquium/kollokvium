"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const thor_io_vnext_1 = require("thor-io.vnext");
const broker_1 = require("./controllers/broker");
const https_1 = __importDefault(require("https"));
const yargs_1 = __importDefault(require("yargs"));
console.clear();
let argv = yargs_1.default.boolean('s').alias('s', 'use-ssl').argv;
let express = require("express");
let app = express();
require("express-ws")(app);
let RTC = new thor_io_vnext_1.ThorIO([
    broker_1.Broker,
]);
let rootPath = path_1.default.resolve('.');
if (fs_1.default.existsSync(path_1.default.join(rootPath, 'dist'))) {
    rootPath = path_1.default.join(rootPath, 'dist');
}
let clientPath = path_1.default.join(rootPath, "client");
if (fs_1.default.existsSync(clientPath)) {
    console.log(`Serving client files from ${clientPath}.`);
    app.use("/", express.static(clientPath));
}
else {
    console.log(`Serving no client files.`);
    app.get("/", (_, res) => res.send('Kollokvium WebSocket Server is running'));
}
app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});
let port = +process.env.PORT;
let keyFile = path_1.default.join(rootPath, 'cert', 'selfsigned.key');
let certFile = path_1.default.join(rootPath, 'cert', 'selfsigned.crt');
if (argv['use-ssl'] && fs_1.default.existsSync(keyFile) && fs_1.default.existsSync(certFile)) {
    port = port || 4433;
    let key = fs_1.default.readFileSync(keyFile);
    let cert = fs_1.default.readFileSync(certFile);
    let options = {
        key: key,
        cert: cert,
        rejectUnauthorized: false,
        agent: false
    };
    https_1.default.createServer(options, app).listen(port);
}
else {
    port = port || 1337;
    app.listen(port);
}
console.log(`Kollokvium version ${process.env.KOLLOKVIUM_VERSION} is listening on ${port}`);

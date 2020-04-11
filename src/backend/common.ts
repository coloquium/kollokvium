import path from 'path';
import fs from 'fs';
import { ThorIO } from 'thor-io.vnext';
import { Broker } from './controllers/broker';

console.clear();

let express = require("express");

export let app = express();

require("express-ws")(app);

let RTC = new ThorIO(
    [
        Broker,
    ]
);

export let rootPath = path.resolve('.');
if (fs.existsSync(path.join(rootPath, 'dist'))) {
    rootPath = path.join(rootPath, 'dist');
}

let clientPath = path.join(rootPath, "client");

if(fs.existsSync(clientPath)){
    app.use("/", express.static(clientPath));
}
else {
    app.get("/", (_, res) => res.send('Kollokvium WebSocket Server is running'));
}

app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});


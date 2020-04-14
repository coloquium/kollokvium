import path from 'path';
import fs from 'fs';
import { ThorIO } from 'thor-io.vnext';
import { Broker } from './controllers/broker';
import https from 'https';

import yargs from 'yargs';

console.clear();

let argv = yargs.boolean('s').alias('s','use-ssl').argv;

let express = require("express");
let app = express();

require("express-ws")(app);

let RTC = new ThorIO(
    [
        Broker,
    ]
);

let rootPath = path.resolve('.');
let clientPath = path.join(rootPath, "client");

if (fs.existsSync(path.join(rootPath, 'dist'))) {
    rootPath = path.join(rootPath, 'dist');
}

if(fs.existsSync(clientPath)){
    app.use("/", express.static(clientPath));
}
else {
    app.get("/", (_, res) => res.send('Kollokvium WebSocket Server is running'));
}

app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});

let port = +process.env.PORT;

let keyFile = path.join(rootPath, 'cert', 'selfsigned.key');
let certFile = path.join(rootPath, 'cert', 'selfsigned.crt')

if(argv['use-ssl'] && fs.existsSync(keyFile) && fs.existsSync(certFile)){

    port = port || 4433;

    let key = fs.readFileSync(keyFile);
    let cert = fs.readFileSync(certFile);

    let options = {
        key: key,
        cert: cert,
        rejectUnauthorized: false,
        agent: false
      };

      https.createServer(options, app).listen(port);
}
else {
    port = port || 1337;
    app.listen(port);
}

console.log("thor-io is serving on", port.toString());
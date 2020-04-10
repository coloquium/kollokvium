import path from 'path';
import fs from 'fs';

import https from 'https';

import { ThorIO } from 'thor-io.vnext';
import { Broker } from './controllers/broker';

console.clear();

let express = require("express");
let app = express();

let RTC = new ThorIO(
    [
        Broker,
    ]
);

require("express-ws")(app);
let rootFolder = path.resolve('.');
if(fs.existsSync(path.join(rootFolder, 'dist'))){
    rootFolder = path.join(rootFolder, 'dist');
}

app.use("/",express.static(path.join(rootFolder, "client"))); 

app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});
let port = process.env.PORT || 4433;

/*
    Generate a selfsigned cert in 'dist folder ->

    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./selfsigned.key -out selfsigned.crt

*/


let key = fs.readFileSync(rootFolder+ '/selfsigned.key');


console.log("key",key);

let cert = fs.readFileSync(rootFolder + '/selfsigned.crt');

let options = {
  key: key,
  cert: cert
};


https.createServer(options, app)
.listen(port);

console.log("thor-io is serving on", port.toString());
import fs from 'fs';
import path from 'path';
import https from 'https';

import {app, rootPath} from './common';

let port = process.env.PORT || 4433;

/*
    Generate a selfsigned cert in 'dist folder ->

    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./selfsigned.key -out selfsigned.crt

*/


let key = fs.readFileSync(path.join(rootPath, 'cert', 'selfsigned.key'));
let cert = fs.readFileSync(path.join(rootPath, 'cert', '/selfsigned.crt'));

console.log("key",key);

let options = {
  key: key,
  cert: cert,
  rejectUnauthorized: false,
  agent: false
};

https.createServer(options, app).listen(port);

console.log("thor-io is serving on", port.toString());
import path from 'path';
import fs from 'fs';
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

let root = path.resolve('.');
if (fs.existsSync(path.join(root, 'dist'))) {
    root = path.join(root, 'dist');
}

require("express-ws")(app);
app.use("/", express.static(path.join(root, "client")));

app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});
var port = process.env.PORT || 1337;
app.listen(port);
console.log("thor-io is serving on", port.toString());


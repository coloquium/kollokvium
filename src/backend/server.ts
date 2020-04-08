import path from 'path';
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

app.use("/",express.static("./client")); 

app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});
var port = process.env.PORT || 1337;
app.listen(port);
console.log("thor-io is serving on", port.toString());

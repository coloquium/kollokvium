let express = require("express");

let app = express();
 

import {ThorIO} from 'thor-io.vnext';

import {Broker} from './backend/controllers/broker'

let thorIO = new ThorIO.Engine(
    [
        Broker,
    ]
); 



var expressWs = require("express-ws")(app);

app.use("/", express.static("."));


app.ws("/", function (ws, req) {    
       thorIO.addWebSocket(ws,req);
});

var port = process.env.PORT || 1337;
app.listen(port);

console.log("thor-io is serving on ",port.toString());
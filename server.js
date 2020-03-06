"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let express = require("express");
let app = express();
const thor_io_vnext_1 = require("thor-io.vnext");
const broker_1 = require("./backend/controllers/broker");
let RTC = new thor_io_vnext_1.ThorIO([
    broker_1.Broker,
]);
require("express-ws")(app);
// app.use(function (req, res, next) {
//     if (req.secure) {
//         next();
//     } else {
//         if (req.headers.host.includes("localhost")) {
//             next()
//         } else
//             res.redirect('https://' + req.headers.host + req.url);
//     }
// });
app.use("/", express.static("."));
app.ws("/", function (ws, req) {
    RTC.addWebSocket(ws, req);
});
var port = process.env.PORT || 1337;
app.listen(port);
console.log("thor-io is serving on", port.toString());

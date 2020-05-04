import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';
import webSocket from 'ws';

import {setup as setupAppInsights, defaultClient as appInsightsClient } from 'applicationinsights';
import yargs from 'yargs';

import { ThorIO } from 'thor-io.vnext';
import { Broker } from './controllers/broker';

console.clear();

let port = +process.env.PORT;
let server: http.Server | https.Server;
let app = express();
let rtc = new ThorIO(
    [
        Broker,
    ]
);
let argv = yargs.boolean('s').alias('s', 'use-ssl').argv;
let rootPath = path.resolve('.');
if (fs.existsSync(path.join(rootPath, 'dist'))) {
    rootPath = path.join(rootPath, 'dist');
}
let clientPath = path.join(rootPath, "client");

let keyFile = path.join(rootPath, 'cert', 'selfsigned.key');
let certFile = path.join(rootPath, 'cert', 'selfsigned.crt')

if(process.env.APPINSIGHTS_INSTRUMENTATIONKEY){
    setupAppInsights()
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .start();
}

    
if (fs.existsSync(clientPath)) {
    console.log(`Serving client files from ${clientPath}.`);
    app.use("/", express.static(clientPath));
}
else {
    console.log(`Serving no client files.`);
    app.get("/", (_, res) => res.send('Kollokvium WebSocket Server is running'));
}

if (argv['use-ssl'] && fs.existsSync(keyFile) && fs.existsSync(certFile)) {

    let key = fs.readFileSync(keyFile);
    let cert = fs.readFileSync(certFile);

    port = port || 4433;
    server = https.createServer({
        cert,
        key
    }, (req, res)=>{
        app(req, res);
        appInsightsClient && appInsightsClient.trackNodeHttpRequest({request: req, response: res});
    });
}
else {
    port = port || 1337;
    server = http.createServer((req, res) => {
        app(req, res);
        appInsightsClient && appInsightsClient.trackNodeHttpRequest({request: req, response: res});
    });
}

const ws = new webSocket.Server({ server });
ws.on('connection', (ws, req) => {
    rtc.addWebSocket (ws, req);
    appInsightsClient && appInsightsClient.trackEvent({ name: 'new client', time: new Date()});
});

server.listen(port);

console.log(`Kollokvium version ${process.env.KOLLOKVIUM_VERSION} is listening on ${port}`);
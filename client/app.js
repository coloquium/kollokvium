"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_client_vnext_1 = require("thor-io.client-vnext");
class App {
    connect(brokerUrl, config) {
        var url = brokerUrl;
        return new thor_io_client_vnext_1.ThorIOClient.Factory(url, ["broker"]);
    }
    constructor() {
        let fullScreenVideo = document.querySelector(".full");
        let slug = document.querySelector("#slug");
        let startButton = document.querySelector("button");
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            }
            else {
                startButton.disabled = true;
            }
        });
        const addRemoteVideo = (mediaStream) => {
            let video = document.createElement("video");
            video.srcObject = mediaStream;
            video.autoplay = true;
            document.querySelector(".remote").append(video);
            document.querySelector(".remote").classList.remove("hide");
            video.addEventListener("click", (e) => {
                fullScreenVideo.play();
                fullScreenVideo.srcObject = e.target.srcObject;
            });
        };
        const addLocalVideo = (mediaStream) => {
            let video = document.querySelector(".local video");
            video.srcObject = mediaStream;
        };
        const rtcConfig = {
            "iceTransports": 'all',
            "rtcpMuxPolicy": "require",
            "bundlePolicy": "max-bundle",
            "iceServers": [
                {
                    "urls": "stun:stun.l.google.com:19302"
                }
            ]
        };
        startButton.addEventListener("click", () => {
            startButton.classList.add("hide");
            document.querySelector(".overlay").classList.add("d-none");
            document.querySelector(".join").classList.add("d-none");
            this.rtcClient.ChangeContext(slug.value);
        });
        // if local ws://localhost:1337/     
        this.factory = this.connect("wss://simpleconf.herokuapp.com/", {});
        this.factory.OnClose = (reason) => {
            console.error(reason);
        };
        this.factory.OnOpen = (broker) => {
            console.log("OnOpen", broker);
            this.rtcClient = new thor_io_client_vnext_1.ThorIOClient.WebRTC(broker, rtcConfig);
            this.rtcClient.OnLocalStream = (mediaStream) => {
            };
            // this will fire when url has a parameter
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {
            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();
                console.log("looks like we are abut to join a context...", ctx);
            };
            this.rtcClient.OnContextDisconnected = (lost) => {
                console.log("lost c");
            };
            this.rtcClient.OnRemoteStream = (mediaStream, connection) => {
                console.log("looks like we got a remote media steam", mediaStream);
                addRemoteVideo(mediaStream);
            };
            this.rtcClient.OnContextCreated = function (ctx) {
                console.log("got a context from the broker", ctx);
            };
            broker.OnOpen = (ci) => {
                console.log("connected to broker");
                // now get a media stream for local
                navigator.getUserMedia({ video: true, audio: true }, (mediaStream) => {
                    this.rtcClient.AddLocalStream(mediaStream);
                    addLocalVideo(mediaStream);
                }, (err) => {
                    console.error(err);
                });
            };
            broker.Connect();
            window["T"] = this.rtcClient;
        };
    }
    static getInstance() {
        return new App();
    }
}
exports.App = App;
document.addEventListener("DOMContentLoaded", () => {
    App.getInstance();
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_client_vnext_1 = require("thor-io.client-vnext");
const clipboard_1 = __importDefault(require("clipboard"));
class App {
    constructor() {
        this.rtcConfig = {
            "iceTransports": 'all',
            "rtcpMuxPolicy": "require",
            "bundlePolicy": "max-bundle",
            "iceServers": [
                {
                    "urls": "stun:stun.l.google.com:19302"
                },
                {
                    urls: ["turn:173.194.72.127:19305?transport=udp",
                        "turn:[2404:6800:4008:C01::7F]:19305?transport=udp",
                        "turn:173.194.72.127:443?transport=tcp",
                        "turn:[2404:6800:4008:C01::7F]:443?transport=tcp"
                    ],
                    username: "CKjCuLwFEgahxNRjuTAYzc/s6OMT",
                    credential: "u1SQDR/SQsPQIxXNWQT7czc/G4c="
                }
            ]
        };
        const joinSlug = location.hash.replace("#", "");
        let fullScreenVideo = document.querySelector(".full");
        let slug = document.querySelector("#slug");
        let startButton = document.querySelector("#joinconference");
        let shareContainer = document.querySelector("#share-container");
        let chatWindow = document.querySelector(".chat");
        let chatMessage = document.querySelector("#chat-message");
        let chatNick = document.querySelector("#chat-nick");
        let chatMessages = document.querySelector("#chatmessages");
        let clipBoard = new clipboard_1.default("#share-link", {
            text: (t) => {
                t.textContent = "Done!";
                return location.origin + "/#" + slug.value;
            }
        });
        if (joinSlug.length >= 6) {
            slug.value = joinSlug;
            startButton.disabled = false;
        }
        document.querySelector("#close-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });
        document.querySelector("#show-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });
        const addRemoteVideo = (mediaStream, peerId) => {
            if (!shareContainer.classList.contains("hide")) {
                shareContainer.classList.add("hide");
            }
            let video = document.createElement("video");
            video.srcObject = mediaStream;
            video.setAttribute("id", "p" + peerId);
            video.autoplay = true;
            document.querySelector("#remote-videos").append(video);
            video.addEventListener("click", (e) => {
                fullScreenVideo.play();
                fullScreenVideo.srcObject = e.target.srcObject;
            });
        };
        const addLocalVideo = (mediaStream) => {
            let video = document.querySelector(".local video");
            video.srcObject = mediaStream;
        };
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            }
            else {
                startButton.disabled = true;
            }
        });
        // set a random nick..
        chatNick.value = Math.random().toString(36).substring(8);
        chatNick.addEventListener("click", () => {
            chatNick.value = "";
        });
        startButton.addEventListener("click", () => {
            startButton.classList.add("hide");
            document.querySelector(".remote").classList.remove("hide");
            document.querySelector(".overlay").classList.add("d-none");
            document.querySelector(".join").classList.add("d-none");
            this.rtcClient.ChangeContext(slug.value);
        });
        // if local ws://localhost:1337/     
        //  wss://simpleconf.herokuapp.com/
        this.factory = this.connect("wss://simpleconf.herokuapp.com/", {});
        this.factory.OnClose = (reason) => {
            console.error(reason);
        };
        this.factory.OnOpen = (broker) => {
            console.log("OnOpen", broker);
            // hook up chat functions...
            broker.On("instantMessage", (im) => {
                let message = document.createElement("p");
                message.textContent = im.text;
                let sender = document.createElement("mark");
                sender.textContent = im.from;
                message.prepend(sender);
                chatMessages.prepend(message);
            });
            chatMessage.addEventListener("keyup", (e) => {
                if (e.keyCode == 13) {
                    this.sendMessage(chatNick.value, chatMessage.value);
                    chatMessage.value = "";
                }
            });
            this.rtcClient = new thor_io_client_vnext_1.ThorIOClient.WebRTC(broker, this.rtcConfig);
            this.rtcClient.OnLocalStream = (mediaStream) => {
            };
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {
            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();
                console.log("looks like we are abut to join a context...", ctx);
            };
            this.rtcClient.OnContextDisconnected = (peer) => {
                console.log("lost connection to", peer);
                document.querySelector("#p" + peer.id).remove();
            };
            this.rtcClient.OnContextConnected = (peer) => {
                console.log("connected to", peer);
                document.querySelector(".remote").classList.remove("hide");
                addRemoteVideo(peer.stream, peer.id);
            };
            this.rtcClient.OnRemoteTrack = (track, connection) => {
                console.log("looks like we got a remote media steamTrack", track);
            };
            this.rtcClient.OnContextCreated = function (ctx) {
                console.log("got a context from the broker", ctx);
            };
            broker.OnOpen = (ci) => {
                console.log("connected to broker, no get a local media stream");
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { min: 640, ideal: 1280 },
                        height: { min: 400, ideal: 720 }
                    }, audio: true,
                }).then((mediaStream) => {
                    this.rtcClient.AddLocalStream(mediaStream);
                    addLocalVideo(mediaStream);
                }).catch(err => {
                    console.error(err);
                });
            };
            broker.Connect();
        };
    }
    sendMessage(sender, message) {
        if (sender.length == 0)
            sender = "NoName";
        const data = {
            text: message,
            from: sender
        };
        this.factory.GetProxy("broker").Invoke("instantMessage", data);
    }
    connect(brokerUrl, config) {
        var url = brokerUrl;
        return new thor_io_client_vnext_1.ThorIOClient.Factory(url, ["broker"]);
    }
    static getInstance() {
        return new App();
    }
}
exports.App = App;
document.addEventListener("DOMContentLoaded", () => {
    App.getInstance();
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_client_vnext_1 = require("thor-io.client-vnext");
const clipboard_1 = __importDefault(require("clipboard"));
class AppParticipant {
    constructor(id) {
        this.id = id;
        this.videoTracks = new Array();
        this.audioTracks = new Array();
    }
    addVideoTrack(t) {
        this.videoTracks.push(t);
        let stream = new MediaStream([t]);
        t.onended = () => {
            // todo: would be an delagated event
            document.querySelector(".p" + this.id).remove();
        };
        this.onVideoAdded(this.id, stream);
    }
    addAudioTrack(t) {
        this.audioTracks.push(t);
        let audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = new MediaStream([t]);
    }
    addTrack(t) {
        t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}
exports.AppParticipant = AppParticipant;
class App {
    constructor() {
        this.rtcConfig = {
            "sdpSemantics": 'plan-b',
            "iceTransports": 'all',
            "rtcpMuxPolicy": "require",
            "bundlePolicy": "max-bundle",
            "iceServers": [
                {
                    "urls": "stun:stun.l.google.com:19302"
                }
            ]
        };
        this.participants = new Map();
        this.Slug = location.hash.replace("#", "");
        this.fullScreenVideo = document.querySelector(".full");
        let slug = document.querySelector("#slug");
        let startButton = document.querySelector("#joinconference");
        this.shareContainer = document.querySelector("#share-container");
        let chatWindow = document.querySelector(".chat");
        let chatMessage = document.querySelector("#chat-message");
        let chatNick = document.querySelector("#chat-nick");
        let chatMessages = document.querySelector("#chatmessages");
        let muteAudio = document.querySelector("#mute-local-audio");
        let muteVideo = document.querySelector("#mute-local-video");
        let screen = document.querySelector("#share-screen");
        muteAudio.addEventListener("click", (e) => {
            this.muteAudio(e);
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e);
        });
        screen.addEventListener("click", () => {
            this.shareScreen();
        });
        let clipBoard = new clipboard_1.default("#share-link", {
            text: (t) => {
                t.textContent = "Done!";
                return location.origin + "/#" + slug.value;
            }
        });
        if (this.Slug.length >= 6) {
            slug.value = this.Slug;
            startButton.disabled = false;
        }
        document.querySelector("#close-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });
        document.querySelector("#show-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });
        slug.addEventListener("click", () => {
            $("#slug").popover('show');
        });
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
            document.querySelector(".our-brand").remove();
            $("#slug").popover('hide');
            startButton.classList.add("hide");
            document.querySelector(".remote").classList.remove("hide");
            document.querySelector(".overlay").classList.add("d-none");
            document.querySelector(".join").classList.add("d-none");
            this.rtcClient.ChangeContext(slug.value);
        });
        // if local ws://localhost:1337/     
        //  wss://simpleconf.herokuapp.com/
        this.factory = this.connect("wss://kollokvium.herokuapp.com/", {});
        this.factory.OnClose = (reason) => {
            console.error(reason);
        };
        this.factory.OnOpen = (broker) => {
            //  let broker = this.factory.GetProxy("broker");
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
            this.rtcClient = new thor_io_client_vnext_1.WebRTC(broker, this.rtcConfig);
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
                document.querySelector(".p" + peer.id).remove();
            };
            this.rtcClient.OnContextConnected = (peer) => {
                document.querySelector(".remote").classList.remove("hide");
                // addRemoteVideo(peer.stream, peer.id);
            };
            this.rtcClient.OnRemoteTrack = (track, connection) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track);
                console.log(participant);
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
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(mediaStream);
                    this.addLocalVideo(mediaStream);
                }).catch(err => {
                    console.error(err);
                });
            };
            broker.Connect();
        };
    }
    shareScreen() {
        const gdmOptions = {
            video: {
                cursor: "always"
            },
            audio: false
        };
        //   audio: {
        //     echoCancellation: true,
        //     noiseSuppression: true,
        //     sampleRate: 44100
        //   }
        navigator.mediaDevices["getDisplayMedia"](gdmOptions).then((stream) => {
            //this.rtcClient.AddLocalStream(stream);
            stream.getVideoTracks().forEach((t) => {
                this.rtcClient.LocalStreams[0].addTrack(t);
            });
            this.addLocalVideo(stream);
            document.querySelector("#share-screen").classList.add("hide");
        }).catch(err => console.error);
    }
    muteVideo(evt) {
        let el = evt.target;
        el.classList.toggle("fa-video");
        el.classList.toggle("fa-video-slash");
        let mediaTrack = this.localMediaStream.getVideoTracks();
        mediaTrack.forEach((track) => {
            track.enabled = !track.enabled;
        });
    }
    muteAudio(evt) {
        let el = evt.target;
        el.classList.toggle("fa-microphone");
        el.classList.toggle("fa-microphone-slash");
        let mediaTrack = this.localMediaStream.getAudioTracks();
        mediaTrack.forEach((track) => {
            track.enabled = !track.enabled;
        });
    }
    addLocalVideo(mediaStream) {
        let video = document.createElement("video");
        video.autoplay = true;
        video.srcObject = mediaStream;
        let container = document.querySelector(".local");
        container.append(video);
    }
    sendMessage(sender, message) {
        if (sender.length == 0)
            sender = "NoName";
        const data = {
            text: message,
            from: sender
        };
        this.factory.GetController("broker").Invoke("instantMessage", data);
    }
    connect(url, config) {
        return new thor_io_client_vnext_1.Factory(url, ["broker"]);
    }
    addRemoteVideo(id, mediaStream) {
        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let video = document.createElement("video");
        video.classList.add("rounded", "mx-auto", "d-block");
        video.srcObject = mediaStream;
        video.setAttribute("class", "p" + id);
        video.autoplay = true;
        document.querySelector("#remote-videos").append(video);
        video.addEventListener("click", (e) => {
            this.fullScreenVideo.play();
            this.fullScreenVideo.srcObject = e.target.srcObject;
        });
    }
    tryAddParticipant(id) {
        if (this.participants.has(id)) {
            return this.participants.get(id);
        }
        else {
            this.participants.set(id, new AppParticipant(id));
            let p = this.participants.get(id);
            p.onVideoAdded = (id, mediaStream) => {
                console.log(id, mediaStream);
                this.addRemoteVideo(id, mediaStream);
            };
            return p;
        }
    }
    static getInstance() {
        return new App();
    }
}
exports.App = App;
document.addEventListener("DOMContentLoaded", () => {
    App.getInstance();
});

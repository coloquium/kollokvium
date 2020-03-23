"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_client_vnext_1 = require("thor-io.client-vnext");
const clipboard_1 = __importDefault(require("clipboard"));
const AppParticipant_1 = require("./AppParticipant");
const ReadFile_1 = require("./ReadFile");
const UserSettings_1 = require("./UserSettings");
const AppDomain_1 = require("./AppDomain");
const MediaStreamRecorder_1 = require("./Recorder/MediaStreamRecorder");
class App {
    /**
     * Creates an instance of App - Kollokvium
     * @memberof App
     */
    constructor() {
        /**
         * PeerConnection configuration
         *
         * @memberof App
         */
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
        // see settings.json
        this.appDomain = new AppDomain_1.AppDomain();
        document.querySelector("#appDomain").textContent = this.appDomain.domain;
        document.querySelector("#appVersion").textContent = this.appDomain.version;
        this.userSettings = new UserSettings_1.UserSettings();
        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            document.querySelector(".only-desktop").classList.add("hide");
        }
        if (!location.href.includes("https://"))
            this.peerId = null;
        this.numOfChatMessagesUnread = 0;
        this.participants = new Map();
        this.Slug = location.hash.replace("#", "");
        this.fullScreenVideo = document.querySelector(".full");
        this.shareContainer = document.querySelector("#share-container");
        this.shareFile = document.querySelector("#share-file");
        this.videoGrid = document.querySelector("#video-grid");
        let slug = document.querySelector("#slug");
        let startButton = document.querySelector("#joinconference");
        let chatWindow = document.querySelector(".chat");
        let chatMessage = document.querySelector("#chat-message");
        let chatNick = document.querySelector("#chat-nick");
        let chatMessages = document.querySelector("#chatmessages");
        let muteAudio = document.querySelector("#mute-local-audio");
        let muteVideo = document.querySelector("#mute-local-video");
        let startScreenShare = document.querySelector("#share-screen");
        let settings = document.querySelector("#settings");
        let saveSettings = document.querySelector("#save-settings");
        let unreadBadge = document.querySelector("#unread-messages");
        let generateSlug = document.querySelector("#generate-slug");
        let nickname = document.querySelector("#txt-nick");
        let videoDevice = document.querySelector("#sel-video");
        let audioDevice = document.querySelector("#sel-audio");
        nickname.value = this.userSettings.nickname;
        this.getMediaDevices().then((devices) => {
            let inputOnly = devices.filter(((d) => {
                return d.kind.indexOf("input") > 0;
            }));
            inputOnly.forEach((d) => {
                let option = document.createElement("option");
                option.textContent = d.label;
                option.setAttribute("value", d.deviceId);
                if (d.kind == "videoinput") {
                    document.querySelector("#sel-video").append(option);
                }
                else {
                    document.querySelector("#sel-audio").append(option);
                }
            });
            videoDevice.value = this.userSettings.videoDevice;
            audioDevice.value = this.userSettings.audioDevice;
            // get the media devices 
        }).catch(console.error);
        saveSettings.addEventListener("click", () => {
            this.userSettings.nickname = nickname.value;
            this.userSettings.audioDevice = audioDevice.value;
            this.userSettings.videoDevice = videoDevice.value;
            this.userSettings.saveSetting();
            this.rtcClient.LocalStreams.forEach((m) => {
                document.querySelector(".l-" + m.id).remove();
            });
            this.rtcClient.LocalStreams = new Array();
            this.getLocalStream(this.userSettings.createConstraints(), (mediaStream) => {
                this.localMediaStream = mediaStream;
                this.rtcClient.AddLocalStream(mediaStream);
                this.addLocalVideo(mediaStream);
            });
        });
        settings.addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
        });
        // jQuery hack for file share
        $("#share-file").popover({
            trigger: "manual",
            sanitize: false,
            placement: "top",
            title: 'Select the file to share.',
            html: true,
            content: $('#share-form').html()
        }).on("inserted.bs.popover", (e) => {
            $(".file-selected").on("change", (evt) => {
                const file = evt.target.files[0];
                ReadFile_1.ReadFile.read(file).then((result) => {
                    this.sendFile({
                        name: result.tf.name,
                        size: result.tf.size,
                        mimeType: result.tf.type
                    }, result.buffer);
                    $("#share-file").popover("hide");
                });
            });
        });
        this.userSettings.slugHistory.getHistory().forEach((slug) => {
            const option = document.createElement("option");
            option.setAttribute("value", slug);
            document.querySelector("#slug-history").prepend(option);
        });
        generateSlug.addEventListener("click", () => {
            slug.value = Math.random().toString(36).substring(2).toLocaleLowerCase();
            startButton.disabled = false;
            $("#random-slug").popover("hide");
        });
        muteAudio.addEventListener("click", (e) => {
            this.muteAudio(e);
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e);
        });
        startScreenShare.addEventListener("click", () => {
            this.shareScreen();
        });
        this.shareFile.addEventListener("click", () => {
            $("#share-file").popover("toggle");
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
            document.querySelector("#random-slug").classList.add("d-none"); // if slug predefined, no random option...
        }
        document.querySelector("#close-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
            unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            unreadBadge.textContent = "0";
        });
        document.querySelector("#show-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
            unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            unreadBadge.textContent = "0";
        });
        slug.addEventListener("click", () => {
            $("#slug").popover('show');
            $("#random-slug").popover("hide");
        });
        if (location.hash.length == 0) {
            $("#random-slug").popover("show");
        }
        else {
            startButton.textContent = "JOIN";
        }
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            }
            else {
                startButton.disabled = true;
            }
        });
        chatNick.value = this.userSettings.nickname;
        chatNick.addEventListener("click", () => {
            chatNick.value = "";
        });
        startButton.addEventListener("click", () => {
            this.videoGrid.classList.add("d-flex");
            $("#random-slug").popover("hide");
            document.querySelector("#share-file").classList.toggle("hide");
            document.querySelector("#share-screen").classList.toggle("d-none");
            document.querySelector("#show-chat").classList.toggle("d-none");
            document.querySelector(".our-brand").remove();
            $("#slug").popover('hide');
            startButton.classList.add("hide");
            document.querySelector(".remote").classList.remove("hide");
            document.querySelector(".overlay").classList.add("d-none");
            document.querySelector(".join").classList.add("d-none");
            this.userSettings.slugHistory.addToHistory(slug.value);
            this.userSettings.saveSetting();
            this.rtcClient.ChangeContext(this.appDomain.getSlug(slug.value));
        });
        // if local ws://localhost:1337/     
        //  wss://simpleconf.herokuapp.com/
        this.factory = this.connectToServer(this.appDomain.serverUrl, {});
        this.factory.OnClose = (reason) => {
            console.error(reason);
        };
        this.factory.OnOpen = (broker) => {
            this.rtcClient = new thor_io_client_vnext_1.WebRTC(broker, this.rtcConfig);
            broker.On("fileShare", (fileinfo, arrayBuffer) => {
                this.fileReceived(fileinfo, arrayBuffer);
            });
            // hook up chat functions...
            broker.On("instantMessage", (im) => {
                this.numOfChatMessagesUnread++;
                let message = document.createElement("p");
                message.textContent = im.text;
                let sender = document.createElement("mark");
                sender.textContent = im.from;
                message.prepend(sender);
                chatMessages.prepend(message);
                if (chatWindow.classList.contains("d-none")) {
                    unreadBadge.classList.remove("d-none");
                    unreadBadge.textContent = this.numOfChatMessagesUnread.toString();
                }
            });
            chatMessage.addEventListener("keyup", (e) => {
                if (e.keyCode == 13) {
                    this.sendMessage(chatNick.value, chatMessage.value);
                    chatMessage.value = "";
                }
            });
            this.rtcClient.OnLocalStream = (mediaStream) => {
            };
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {
            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();
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
                participant.addTrack(track, (el) => {
                    document.querySelector("#remtote-audio-nodes").append(el);
                });
                participant.onVideoTrackLost = (id, stream, track) => {
                    let p = document.querySelector(".p" + id);
                    if (p)
                        p.remove();
                };
            };
            this.rtcClient.OnContextCreated = function (ctx) {
                // noop
            };
            broker.OnOpen = (ci) => {
                this.getLocalStream(this.userSettings.createConstraints(), (mediaStream) => {
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(mediaStream);
                    this.addLocalVideo(mediaStream);
                });
            };
            broker.Connect();
        };
    }
    // Create a an AppDomain of kollokvium;
    getLocalStream(constraints, cb) {
        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
            cb(mediaStream);
        }).catch(err => {
            console.error(err);
        });
    }
    /**
     * Adds a fileshare message to chat, when someone shared a file...
     *
     * @param {*} fileinfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    fileReceived(fileinfo, arrayBuffer) {
        const p = document.createElement("p");
        p.textContent = "Hye,here is shared file... ";
        const blob = new Blob([arrayBuffer], {
            type: fileinfo.mimeType
        });
        const blobUrl = window.URL.createObjectURL(blob);
        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = fileinfo.name;
        download.setAttribute("download", fileinfo.name);
        p.append(download);
        document.querySelector("#chatmessages").prepend(p);
    }
    /**
     * Send a file to all in conference
     *
     * @param {*} fileInfo
     * @param {ArrayBuffer} buffer
     * @memberof App
     */
    sendFile(fileInfo, buffer) {
        var message = new thor_io_client_vnext_1.Message("fileShare", fileInfo, "broker", buffer);
        let bm = new thor_io_client_vnext_1.BinaryMessage(message.toString(), buffer);
        this.factory.GetController("broker").InvokeBinary(bm.Buffer);
    }
    /**
     * Prompt user for a screen , tab, window.
     * and add the media stream to share
     * @memberof App
     */
    shareScreen() {
        const gdmOptions = {
            video: {
                cursor: "always"
            },
            audio: false
        };
        navigator.mediaDevices["getDisplayMedia"](gdmOptions).then((stream) => {
            stream.getVideoTracks().forEach((t) => {
                this.rtcClient.LocalStreams[0].addTrack(t);
            });
            this.addLocalVideo(stream);
            document.querySelector("#share-screen").classList.add("hide");
        }).catch(err => console.error);
    }
    /**
     * Mute local video  ( self )
     *
     * @param {*} evt
     * @memberof App
     */
    muteVideo(evt) {
        let el = evt.target;
        el.classList.toggle("fa-video");
        el.classList.toggle("fa-video-slash");
        let mediaTrack = this.localMediaStream.getVideoTracks();
        mediaTrack.forEach((track) => {
            track.enabled = !track.enabled;
        });
    }
    /**
     * Mute local video ( self )
     *
     * @param {*} evt
     * @memberof App
     */
    muteAudio(evt) {
        let el = evt.target;
        el.classList.toggle("fa-microphone");
        el.classList.toggle("fa-microphone-slash");
        let mediaTrack = this.localMediaStream.getAudioTracks();
        mediaTrack.forEach((track) => {
            track.enabled = !track.enabled;
        });
    }
    /**
     * Record a remotestream
     *
     * @param {string} peerid
     * @memberof App
     */
    recordStream(peerid) {
        if (!this.recorder) {
            let tracks = this.rtcClient.Peers.get(peerid).stream.getTracks();
            this.recorder = new MediaStreamRecorder_1.MediaStreamRecorder(tracks);
            this.recorder.mediaStream.addTrack(this.rtcClient.LocalStreams[0].getAudioTracks()[0]);
            this.recorder.start(20);
        }
        else {
            this.recorder.stop();
            let result = this.recorder.toBlob();
            const download = document.createElement("a");
            download.setAttribute("href", result);
            download.textContent = peerid;
            download.setAttribute("download", `${peerid}.webm`);
            document.querySelector("#recorder-download").append(download);
            $("#recorder-result").modal("show");
            this.recorder = null;
        }
    }
    /**
     * Add a local media stream to the UI
     *
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addLocalVideo(mediaStream) {
        let video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.classList.add("l-" + mediaStream.id);
        video.srcObject = mediaStream;
        let container = document.querySelector(".local");
        container.append(video);
    }
    /**
     * Send chat message
     *
     * @param {string} sender
     * @param {string} message
     * @memberof App
     */
    sendMessage(sender, message) {
        if (sender.length == 0)
            sender = "NoName";
        const data = {
            text: message,
            from: sender
        };
        this.factory.GetController("broker").Invoke("instantMessage", data);
    }
    /**
     *  Connect to the realtime server (websocket) and its controller
     *
     * @param {string} url
     * @param {*} config
     * @returns {Factory}
     * @memberof App
     */
    connectToServer(url, config) {
        return new thor_io_client_vnext_1.Factory(url, ["broker"]);
    }
    /**
     * Add remote video stream
     *
     * @param {string} id
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addRemoteVideo(id, mediaStream) {
        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let videoTools = document.createElement("div");
        videoTools.classList.add("video-tools");
        let item = document.createElement("li");
        item.setAttribute("class", "p" + id);
        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "fullscreen");
        let r = document.createElement("i");
        r.classList.add("fas", "fa-circle", "fa-2x", "record");
        r.dataset.peerid = id;
        videoTools.append(f);
        videoTools.append(r);
        item.prepend(videoTools);
        let video = document.createElement("video");
        video.srcObject = mediaStream;
        video.width = 1920;
        video.height = 1080;
        video.autoplay = true;
        item.append(video);
        // listener for fulscreen view of a participants video
        f.addEventListener("click", (e) => {
            let elem = video;
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
            else {
                document.exitFullscreen();
            }
        });
        r.addEventListener("click", (e) => {
            let s = e.target;
            s.classList.toggle("flash");
            this.recordStream(s.dataset.peerid);
        });
        // beta only supports one participant..
        if (this.participants.size > 1)
            r.classList.add("hide");
        document.querySelector("#remote-videos").append(item);
        video.addEventListener("click", (e) => {
            this.fullScreenVideo.play();
            this.fullScreenVideo.srcObject = e.target.srcObject;
        });
    }
    getMediaDevices() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.enumerateDevices().then((devices) => {
                resolve(devices);
            }).catch(reject);
        });
    }
    ;
    /**
     *  Add aparticipant to the "conference"
     *
     * @param {string} id
     * @returns {AppParticipant}
     * @memberof App
     */
    tryAddParticipant(id) {
        if (this.participants.has(id)) {
            return this.participants.get(id);
        }
        else {
            this.participants.set(id, new AppParticipant_1.AppParticipant(id));
            let p = this.participants.get(id);
            p.onVideoTrackAdded = (id, mediaStream, mediaStreamTrack) => {
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
/*
    Launch the application
*/
document.addEventListener("DOMContentLoaded", () => {
    if (!(location.href.includes("https://") || location.href.includes("http://localhost")))
        location.href = location.href.replace("http://", "https://");
    App.getInstance();
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const thor_io_client_vnext_1 = require("thor-io.client-vnext");
const AppParticipant_1 = require("./AppParticipant");
const ReadFile_1 = require("./Helpers/ReadFile");
const UserSettings_1 = require("./UserSettings");
const AppDomain_1 = require("./AppDomain");
const mediastreamblender_1 = require("mediastreamblender");
const DetectResolutions_1 = require("./Helpers/DetectResolutions");
const AppComponentToaster_1 = require("./Components/AppComponentToaster");
const DungeonComponent_1 = require("./Components/DungeonComponent");
const DOMUtils_1 = require("./Helpers/DOMUtils");
const GreenScreenComponent_1 = require("./Components/GreenScreenComponent");
const AudioNodes_1 = require("./Audio/AudioNodes");
const Subtitles_1 = require("./Audio/Subtitles");
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
        this.appDomain = new AppDomain_1.AppDomain();
        this.factory = this.connectToServer(this.appDomain.serverUrl, {});
        this.userSettings = new UserSettings_1.UserSettings();
        DOMUtils_1.DOMUtils.get("#appDomain").textContent = this.appDomain.domain;
        DOMUtils_1.DOMUtils.get("#appVersion").textContent = this.appDomain.version;
        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            DOMUtils_1.DOMUtils.get(".only-desktop").classList.add("hide");
        }
        this.audioNodes = new AudioNodes_1.AudioNodes();
        this.mediaStreamBlender = new mediastreamblender_1.MediaStreamBlender();
        let blenderWaterMark = DOMUtils_1.DOMUtils.get("#watermark");
        this.mediaStreamBlender.onFrameRendered = (ctx) => {
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(blenderWaterMark, 10, 10, 100, 100);
            ctx.restore();
        };
        this.mediaStreamBlender.onTrack = () => {
            // this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();
        };
        this.mediaStreamBlender.onRecordingStart = () => {
            this.sendMessage(this.userSettings.nickname, "I'm now recording the session.");
        };
        this.mediaStreamBlender.onRecordingEnded = (blobUrl) => {
            this.displayRecording(blobUrl);
        };
        this.mediaStreamBlender.onTrackEnded = () => {
            this.mediaStreamBlender.refreshCanvas();
        };
        this.greenScreen = new GreenScreenComponent_1.GreenScreenComponent("gss");
        this.greenScreen.onApply = (mediaStream) => {
            let a = this.localMediaStream.getVideoTracks()[0];
            this.localMediaStream.removeTrack(a);
            this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
        };
        DOMUtils_1.DOMUtils.get("#components").append(this.greenScreen.render());
        this.numOfChatMessagesUnread = 0;
        this.participants = new Map();
        this.dungeons = new Map();
        this.slug = location.hash.replace("#", "");
        this.generateSubtitles = DOMUtils_1.DOMUtils.get("#subtitles");
        this.fullScreenVideo = DOMUtils_1.DOMUtils.get(".full");
        this.shareContainer = DOMUtils_1.DOMUtils.get("#share-container");
        this.shareFile = DOMUtils_1.DOMUtils.get("#share-file");
        this.videoGrid = DOMUtils_1.DOMUtils.get("#video-grid");
        this.chatWindow = DOMUtils_1.DOMUtils.get(".chat");
        this.lockContext = DOMUtils_1.DOMUtils.get("#context-lock");
        this.unreadBadge = DOMUtils_1.DOMUtils.get("#unread-messages");
        this.leaveCotext = DOMUtils_1.DOMUtils.get("#leave-context");
        this.startButton = DOMUtils_1.DOMUtils.get("#joinconference");
        this.shareSlug = DOMUtils_1.DOMUtils.get("#share-slug");
        let slug = DOMUtils_1.DOMUtils.get("#slug");
        let chatMessage = DOMUtils_1.DOMUtils.get("#chat-message");
        let muteAudio = DOMUtils_1.DOMUtils.get("#mute-local-audio");
        let muteVideo = DOMUtils_1.DOMUtils.get("#mute-local-video");
        let muteSpeakers = DOMUtils_1.DOMUtils.get("#mute-speakers");
        let startScreenShare = DOMUtils_1.DOMUtils.get("#share-screen");
        let settings = DOMUtils_1.DOMUtils.get("#settings");
        let saveSettings = DOMUtils_1.DOMUtils.get("#save-settings");
        let generateSlug = DOMUtils_1.DOMUtils.get("#generate-slug");
        let nickname = DOMUtils_1.DOMUtils.get("#txt-nick");
        let videoDevice = DOMUtils_1.DOMUtils.get("#sel-video");
        let audioDevice = DOMUtils_1.DOMUtils.get("#sel-audio");
        let videoResolution = DOMUtils_1.DOMUtils.get("#sel-video-res");
        // just set the value to saved key, as user needs to scan..
        let closeQuickstartButton = DOMUtils_1.DOMUtils.get("#close-quick-start");
        let helpButton = DOMUtils_1.DOMUtils.get("#help");
        DOMUtils_1.DOMUtils.get("#sel-video-res option").textContent = "Using dynamic resolution";
        let toogleRecord = DOMUtils_1.DOMUtils.get("#record-all");
        let testResolutions = DOMUtils_1.DOMUtils.get("#test-resolutions");
        nickname.value = this.userSettings.nickname;
        this.videoGrid.addEventListener("click", () => {
            this.videoGrid.classList.remove("blur");
        });
        testResolutions.addEventListener("click", () => {
            this.testCameraResolutions();
        });
        this.lockContext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("lockContext", {});
        });
        this.getMediaDevices().then((devices) => {
            let inputOnly = devices.filter(((d) => {
                return d.kind.indexOf("input") > 0;
            }));
            inputOnly.forEach((d, index) => {
                let option = document.createElement("option");
                option.textContent = d.label || `Device #${index} (name unknown)`;
                option.value = d.deviceId;
                if (d.kind == "videoinput") {
                    if (option.value == this.userSettings.videoDevice)
                        option.selected = true;
                    DOMUtils_1.DOMUtils.get("#sel-video").append(option);
                }
                else {
                    if (option.value == this.userSettings.audioDevice)
                        option.selected = true;
                    DOMUtils_1.DOMUtils.get("#sel-audio").append(option);
                }
            });
            devices.filter(((d) => {
                return d.kind.indexOf("output") > 0;
            })).forEach(((d) => {
                let option = document.createElement("option");
                option.textContent = d.label || d.kind;
                option.setAttribute("value", d.deviceId);
                DOMUtils_1.DOMUtils.get("#sel-audio-out").append(option);
            }));
            videoDevice.value = this.userSettings.videoDevice;
            audioDevice.value = this.userSettings.audioDevice;
            // get the media devices 
        }).catch(console.error);
        saveSettings.addEventListener("click", () => {
            this.userSettings.nickname = nickname.value;
            this.userSettings.audioDevice = audioDevice.value;
            this.userSettings.videoDevice = videoDevice.value;
            this.userSettings.videoResolution = videoResolution.value;
            this.userSettings.saveSetting();
            let constraints = this.userSettings.createConstraints(this.userSettings.videoResolution);
            this.localMediaStream.getVideoTracks().forEach((track) => {
                track.applyConstraints(constraints["video"]).then(() => {
                }).catch((e) => {
                    console.error(e);
                });
            });
        });
        settings.addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
        });
        // jQuery hacks for file share etc
        $('.modal').on('shown.bs.modal', function () {
            $(".popover").popover("hide");
        });
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
                this.sendFile(file);
            });
        });
        DOMUtils_1.DOMUtils.get("#create-dungeon").addEventListener("click", () => {
            $("#modal-dungeon").modal("toggle");
            let container = DOMUtils_1.DOMUtils.get(".dungeon-thumbs");
            container.innerHTML = "";
            // get a new list of participants , and show thumbs
            this.participants.forEach((p) => {
                p.captureImage().then((i) => {
                    let canvas = document.createElement("canvas");
                    canvas.height = i.height;
                    canvas.width = i.width;
                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(i, 0, 0, i.width, i.height);
                    canvas.dataset.peerId = p.id;
                    canvas.addEventListener("click", () => {
                        canvas.classList.toggle("dungeon-paricipant");
                    });
                    container.append(canvas);
                });
            });
        });
        DOMUtils_1.DOMUtils.get("button#invite-dungeon").addEventListener("click", () => {
            DOMUtils_1.DOMUtils.get(".dungeons").classList.remove("d-none");
            $("#modal-dungeon").modal("toggle");
            let peers = new Array();
            DOMUtils_1.DOMUtils.getAll(".dungeon-paricipant").forEach((el) => {
                peers.push(el.dataset.peerId);
            });
            const key = Math.random().toString(36).substring(6);
            this.addDungeon(key);
            this.factory.GetController("broker").Invoke("inviteDungeon", {
                peerIds: peers,
                key: key,
                context: this.rtcClient.Context
            });
        });
        this.userSettings.slugHistory.getHistory().forEach((slug) => {
            const option = document.createElement("option");
            option.setAttribute("value", slug);
            DOMUtils_1.DOMUtils.get("#slug-history").prepend(option);
        });
        generateSlug.addEventListener("click", () => {
            slug.value = Math.random().toString(36).substring(2).toLocaleLowerCase();
            this.startButton.disabled = false;
            $("#random-slug").popover("hide");
        });
        this.generateSubtitles.addEventListener("click", () => {
            this.generateSubtitles.classList.toggle("flash");
            const transcriber = new Subtitles_1.Subtitles(this.rtcClient.LocalPeerId, new MediaStream(this.rtcClient.LocalStreams[0].getAudioTracks()));
            transcriber.onFinal = (peerId, result) => {
                console.log("-->", peerId, result);
                this.arbitraryChannel.Invoke("transcript", {
                    peerId: peerId,
                    text: result
                });
            };
            transcriber.start();
            transcriber.onReady = () => {
                transcriber.start();
            };
        });
        muteSpeakers.addEventListener("click", () => {
            muteSpeakers.classList.toggle("fa-volume-mute");
            muteSpeakers.classList.toggle("fa-volume-up");
            this.audioNodes.toggleMuteAll();
        });
        muteAudio.addEventListener("click", (e) => {
            this.muteAudio(e);
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e);
        });
        toogleRecord.addEventListener("click", () => {
            toogleRecord.classList.toggle("flash");
            this.recordAllStreams();
        });
        startScreenShare.addEventListener("click", () => {
            this.shareScreen();
        });
        this.shareFile.addEventListener("click", () => {
            $("#share-file").popover("toggle");
        });
        helpButton.addEventListener("click", () => {
            $("#quick-start-container").modal("show");
            this.userSettings.showQuickStart = true;
            this.userSettings.saveSetting();
        });
        DOMUtils_1.DOMUtils.get("button#share-link").addEventListener("click", (e) => {
            navigator.clipboard.writeText(`${this.appDomain.host}/#${slug.value}`).then(() => {
                e.target.textContent = "Done!";
            });
        });
        this.shareSlug.addEventListener("click", () => {
            navigator.clipboard.writeText(`${this.appDomain.host}/#${slug.value}`).then(() => {
                $("#share-slug").popover("show");
                setTimeout(() => {
                    $("#share-slug").popover("hide");
                }, 5000);
            });
        });
        if (this.slug.length >= 6) {
            slug.value = this.slug;
            this.startButton.disabled = false;
            DOMUtils_1.DOMUtils.get("#random-slug").classList.add("d-none"); // if slug predefined, no random option...
        }
        DOMUtils_1.DOMUtils.get("#close-chat").addEventListener("click", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            this.unreadBadge.textContent = "0";
        });
        DOMUtils_1.DOMUtils.get("#show-chat").addEventListener("click", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            this.unreadBadge.textContent = "0";
        });
        slug.addEventListener("click", () => {
            $("#slug").popover('show');
            $("#random-slug").popover("hide");
        });
        if (location.hash.length >= 6) {
            this.startButton.textContent = "JOIN";
        }
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));
            }
            else {
                this.startButton.disabled = true;
            }
        });
        nickname.addEventListener("change", () => {
            this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
        });
        this.leaveCotext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("leaveContext", {});
        });
        this.startButton.addEventListener("click", () => {
            this.enableConferenceElements();
            this.userSettings.slugHistory.addToHistory(slug.value);
            window.history.pushState({}, window.document.title, `#${slug.value}`);
            this.userSettings.saveSetting();
            this.rtcClient.ChangeContext(this.appDomain.getSlug(slug.value));
        });
        chatMessage.addEventListener("keydown", (e) => {
            if (e.keyCode == 13) {
                this.sendMessage(this.userSettings.nickname, chatMessage.value);
                chatMessage.value = "";
            }
        });
        this.factory.OnClose = (reason) => {
            console.error(reason);
        };
        this.factory.OnOpen = (broker) => {
            this.rtcClient = new thor_io_client_vnext_1.WebRTC(broker, this.rtcConfig);
            // set up peer dataChannels 
            this.arbitraryChannel = this.rtcClient.CreateDataChannel(`chat-${this.appDomain.contextPrefix}-dc`);
            this.fileChannel = this.rtcClient.CreateDataChannel(`file-${this.appDomain.contextPrefix}-dc`);
            this.fileChannel.On("fileShare", (fileinfo, arrayBuffer) => {
                this.displayReceivedFile(fileinfo, new Blob([arrayBuffer], {
                    type: fileinfo.mimeType
                }));
            });
            this.arbitraryChannel.On("transcript", (data) => {
                console.log("<--transcript", data);
                DOMUtils_1.DOMUtils.get(`.subs${data.peerId}`).textContent = data.text;
            });
            this.arbitraryChannel.On("streamChange", (data) => {
                let el = DOMUtils_1.DOMUtils.get(".s" + data.id);
                if (el)
                    el.remove();
            });
            this.arbitraryChannel.On("chatMessage", (data) => {
                this.displayChatMessage(data);
            });
            this.arbitraryChannel.OnOpen = (e, peerId) => {
            };
            broker.On("leaveContext", (data) => {
                this.rtcClient.Peers.forEach((connection) => {
                    connection.RTCPeer.close();
                });
                this.participants.clear();
                DOMUtils_1.DOMUtils.get("#remote-videos").innerHTML = "";
                this.disableConfrenceElements();
            });
            // broker.On("fileShare", (fileinfo: any, arrayBuffer: ArrayBuffer) => {
            //     this.displayReceivedFile(fileinfo, arrayBuffer)
            // });
            broker.On("lockContext", () => {
                this.lockContext.classList.toggle("fa-lock-open");
                this.lockContext.classList.toggle("fa-lock");
            });
            broker.On("isRoomLocked", (data) => {
                this.startButton.disabled = data.state;
                if (data.state) {
                    slug.classList.add("is-invalid");
                }
                else {
                    slug.classList.remove("is-invalid");
                }
            });
            broker.On("leaveDungeon", (data) => {
                this.dungeons.get(data.key).removeParticipant(data.peerId);
            });
            broker.On("inviteDungeon", (invite) => {
                let toast = AppComponentToaster_1.AppComponentToaster.dungeonToaster("Dungeon invite", "Someone in the meeting created a dungeon...");
                let node = toast.children[0];
                node.dataset.peerId = invite.peerId;
                toast.querySelector(".btn-primary").addEventListener("click", (el) => {
                    this.factory.GetController("broker").Invoke("acceptDungeon", invite);
                    this.addDungeon(invite.key);
                    node.remove();
                    try {
                        this.dungeons.get(invite.key).addDungeonParticipant(this.participants.get(invite.creator));
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
                toast.querySelector(".btn-danger").addEventListener("click", (el) => {
                    this.factory.GetController("broker").Invoke("declineDungeon", invite);
                    node.remove();
                });
                DOMUtils_1.DOMUtils.get(".toasters").prepend(toast);
                $(".toast").toast("show");
            });
            broker.On("acceptDungeon", (data) => {
                let d = this.dungeons.get(data.key);
                try {
                    d.addDungeonParticipant(this.participants.get(data.peerId));
                }
                catch (e) {
                    console.log(e);
                }
            });
            broker.On("chatMessage", (data) => {
                this.displayChatMessage(data);
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
                DOMUtils_1.DOMUtils.get(".p" + peer.id).remove();
                this.participants.delete(peer.id);
            };
            this.rtcClient.OnContextConnected = (peer) => {
                DOMUtils_1.DOMUtils.get(".remote").classList.add("hide");
            };
            this.rtcClient.OnRemoteTrack = (track, connection) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track);
            };
            this.rtcClient.OnContextCreated = function (ctx) {
                // noop
            };
            broker.OnOpen = (ci) => {
                if (slug.value.length >= 6) {
                    this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));
                }
                this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
                //this.userSettings.createConstraints(this.userSettings.videoResolution)
                this.getLocalStream(UserSettings_1.UserSettings.defaultConstraints, (mediaStream) => {
                    DOMUtils_1.DOMUtils.get("#await-streams").classList.toggle("hide");
                    DOMUtils_1.DOMUtils.get("#has-streams").classList.toggle("hide");
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(this.localMediaStream);
                    this.addLocalVideo(this.localMediaStream, true);
                    if (location.hash.length <= 6)
                        $("#random-slug").popover("show");
                });
            };
            broker.Connect();
        };
    }
    /**
     *
     *
     * @memberof App
     */
    testCameraResolutions() {
        let parent = DOMUtils_1.DOMUtils.get("#sel-video-res");
        parent.innerHTML = "";
        let deviceId = DOMUtils_1.DOMUtils.get("#sel-video").value;
        DetectResolutions_1.DetectResolutions.testResolutions(deviceId == "" ? undefined : deviceId, (result) => {
            let option = document.createElement("option");
            option.textContent = `${result.label} ${result.width} x ${result.height} ${result.ratio}`;
            option.value = result.label;
            parent.append(option);
        });
        parent.removeAttribute("disabled");
    }
    /**
     *
     *
     * @param {MediaStreamConstraints} constraints
     * @param {Function} cb
     * @memberof App
     */
    getLocalStream(constraints, cb) {
        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
            cb(mediaStream);
        }).catch(err => {
            console.error(err);
        });
    }
    /**
     * Adds a fileshare message to chat windw
     *
     * @param {*} fileinfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    displayReceivedFile(fileinfo, blob) {
        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils_1.DOMUtils.linkify("Hey,the file is ready to download, click to download ");
        sender.textContent = fileinfo.sender;
        message.prepend(time);
        message.prepend(sender);
        message.append(messageText);
        const blobUrl = window.URL.createObjectURL(blob);
        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = fileinfo.name;
        download.setAttribute("download", fileinfo.name);
        messageText.append(download);
        DOMUtils_1.DOMUtils.get("#chatmessages").prepend(message);
    }
    /**
     * Add a chat messge to the chat window
     *
     * @param {*} msg
     * @memberof App
     */
    displayChatMessage(msg) {
        let chatMessages = DOMUtils_1.DOMUtils.get("#chatmessages");
        this.numOfChatMessagesUnread++;
        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils_1.DOMUtils.linkify(msg.text);
        sender.textContent = msg.from;
        message.prepend(time);
        message.prepend(sender);
        message.append(messageText);
        chatMessages.prepend(message);
        if (this.chatWindow.classList.contains("d-none")) {
            this.unreadBadge.classList.remove("d-none");
            this.unreadBadge.textContent = this.numOfChatMessagesUnread.toString();
        }
    }
    /**
     * Send a file to all in conference (room)
     *
     * @param {*} fileInfo
     * @param {ArrayBuffer} buffer
     * @memberof App
     */
    sendFile(file) {
        if (!file)
            return;
        let sendprogress = document.querySelector(".progress-bar");
        sendprogress.setAttribute("aria-valuenow", "0");
        sendprogress.setAttribute("aria-valuemax", file.siz);
        let meta = {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            sender: this.userSettings.nickname
        };
        const shareId = thor_io_client_vnext_1.Utils.newGuid();
        ReadFile_1.ReadFile.readChunks(file, (data, bytes, isFinal) => {
            this.fileChannel.InvokeBinary("fileShare", meta, data, isFinal, shareId);
            if (isFinal) {
                setTimeout(() => {
                    $("#share-file").popover("hide");
                }, 2000);
            }
        });
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
                this.rtcClient.addTrackToPeers(t);
            });
            this.addLocalVideo(stream, false);
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
     *
     *
     * @param {string} id
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    recordSingleStream(id) {
        if (!this.isRecording) {
            let tracks = this.participants.get(id).getTracks();
            this.singleStreamRecorder = new mediastreamblender_1.MediaStreamRecorder(tracks);
            this.singleStreamRecorder.start(10);
            this.isRecording = true;
        }
        else {
            DOMUtils_1.DOMUtils.get("i.is-recordig").classList.remove("flash");
            this.isRecording = false;
            this.singleStreamRecorder.stop();
            this.singleStreamRecorder.flush().then((blobUrl) => {
                this.displayRecording(blobUrl);
            });
        }
    }
    recordAllStreams() {
        if (!this.mediaStreamBlender.isRecording) {
            // clear al prior tracks
            // temp fix due to mediaStreamBlender missing method
            this.mediaStreamBlender.audioSources.clear();
            this.mediaStreamBlender.videosSources.clear();
            Array.from(this.participants.values()).forEach((p) => {
                this.mediaStreamBlender.addTracks(p.id, p.videoTracks.concat(p.audioTracks), false);
            });
            this.mediaStreamBlender.addTracks("self", this.localMediaStream.getTracks(), true);
            this.mediaStreamBlender.refreshCanvas();
            this.mediaStreamBlender.render(25);
            this.mediaStreamBlender.record();
        }
        else {
            this.mediaStreamBlender.render(0);
            this.mediaStreamBlender.record();
        }
    }
    /**
     * Display recording results
     *
     * @param {string} blobUrl
     * @memberof App
     */
    displayRecording(blobUrl) {
        let p = document.createElement("p");
        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = "Your recording has ended, here is the file. ( click to download )";
        download.setAttribute("download", `${Math.random().toString(36).substring(6)}.webm`);
        p.append(download);
        DOMUtils_1.DOMUtils.get("#recorder-download").append(p);
        $("#recorder-result").modal("show");
    }
    /**
     * Add a local media stream to the UI
     *
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addLocalVideo(mediaStream, isCam) {
        let video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.classList.add("l-" + mediaStream.id);
        video.srcObject = mediaStream;
        mediaStream.getVideoTracks()[0].onended = () => {
            this.arbitraryChannel.Invoke("streamChange", { id: mediaStream.getVideoTracks()[0].id });
            DOMUtils_1.DOMUtils.get(".l-" + mediaStream.id).remove();
        };
        if (isCam)
            video.classList.add("local-cam");
        let container = DOMUtils_1.DOMUtils.get(".local");
        container.append(video);
        if (isCam) {
            video.addEventListener("click", () => {
                const track = mediaStream.getVideoTracks()[0];
                track.applyConstraints({ width: 800, height: 450 });
                this.greenScreen.setMediaTrack(track);
                $("#gss").modal("show");
            });
        }
        //this.mediaStreamBlender.addTracks(mediaStream.id, mediaStream.getTracks(), true);
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
        // this.rtcClient.DataChannels.get(`chat-${this.appDomain.contextPrefix}-dc`).PeerChannels.forEach((pc: PeerChannel) => {
        //     if(pc.dataChannel.readyState === "open")
        //         pc.dataChannel.send(new TextMessage("chatMessage", data, pc.label).toString());
        // });
        this.arbitraryChannel.Invoke("chatMessage", data);
        // also display to self..
        this.displayChatMessage(data);
        // this.factory.GetController("broker").Invoke("chatMessage",
        //     data
        // );
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
    addRemoteVideo(id, mediaStream, trackId) {
        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let videoTools = document.createElement("div");
        videoTools.classList.add("video-tools", "p2", "darken");
        let item = document.createElement("li");
        item.classList.add("p" + id);
        item.classList.add("s" + trackId);
        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "white");
        let r = document.createElement("i");
        r.classList.add("fas", "fa-circle", "fa-2x", "red");
        r.addEventListener("click", () => {
            if (!this.isRecording)
                r.classList.add("flash", "is-recordig");
            this.recordSingleStream(id);
        });
        videoTools.append(f);
        videoTools.append(r);
        item.prepend(videoTools);
        let video = document.createElement("video");
        video.srcObject = mediaStream;
        video.width = 1280;
        video.height = 720;
        video.autoplay = true;
        let subs = document.createElement("div");
        subs.classList.add("subtitles");
        subs.classList.add("subs" + id);
        item.append(subs);
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
        DOMUtils_1.DOMUtils.get("#remote-videos").append(item);
    }
    /**
     *
     *
     * @param {string} key
     * @memberof App
     */
    addDungeon(key) {
        let d = new DungeonComponent_1.DungeonComponent(key);
        this.dungeons.set(key, d);
        d.render(DOMUtils_1.DOMUtils.get(".dungeons"));
        DOMUtils_1.DOMUtils.get("#dungeon-" + key + " i").addEventListener("click", () => {
            d.destroy((peers) => {
                peers.forEach((peerId) => {
                    this.factory.GetController("broker").Invoke("leaveDungeon", {
                        key: d.id,
                        peerId: peerId
                    });
                });
                this.dungeons.delete(key);
                DOMUtils_1.DOMUtils.get("#dungeon-" + key).remove();
            });
        });
        DOMUtils_1.DOMUtils.get("#dungeon-" + key).addEventListener("click", () => {
            DOMUtils_1.DOMUtils.get(".video-grid").classList.add("blur");
            //this.audioNode.muted = true;
            DOMUtils_1.DOMUtils.get(".dungeons-header").classList.add("flash");
        });
        if (DOMUtils_1.DOMUtils.get(".dungeons").classList.contains("d-none")) {
            DOMUtils_1.DOMUtils.get(".dungeons").classList.remove("d-none");
        }
    }
    /**
     * Get this clients media devices
     *
     * @returns {Promise<Array<MediaDeviceInfo>>}
     * @memberof App
     */
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
                this.addRemoteVideo(id, mediaStream, mediaStreamTrack.id);
            };
            p.onAudioTrackAdded = (id, mediaStream, mediaStreamTrack) => {
                this.audioNodes.add(id, mediaStream);
            };
            p.onVideoTrackLost = (id, stream, track) => {
                let p = DOMUtils_1.DOMUtils.get(".p" + id);
                if (p)
                    p.remove();
            };
            p.onAudioTrackLost = (id, stream, track) => {
                this.audioNodes.remove(id);
            };
            return p;
        }
    }
    disableConfrenceElements() {
        location.hash = "";
        let slug = DOMUtils_1.DOMUtils.get("#slug");
        slug.value = "";
        DOMUtils_1.DOMUtils.get("#random-slug").classList.remove("d-none");
        this.videoGrid.classList.remove("d-flex");
        this.lockContext.classList.add("hide");
        this.leaveCotext.classList.add("hide");
        this.startButton.disabled = true;
        this.startButton.classList.remove("hide");
        this.shareSlug.classList.add("hide");
        DOMUtils_1.DOMUtils.get(".fa-dungeon").classList.add("hide");
        DOMUtils_1.DOMUtils.get(".top-bar").classList.add("d-none");
        DOMUtils_1.DOMUtils.get("#record").classList.add("d-none");
        DOMUtils_1.DOMUtils.get("#share-file").classList.toggle("hide");
        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils_1.DOMUtils.get("#show-chat").classList.toggle("d-none");
        DOMUtils_1.DOMUtils.get(".remote").classList.add("hide");
        DOMUtils_1.DOMUtils.get(".overlay").classList.remove("d-none");
        DOMUtils_1.DOMUtils.get(".join").classList.remove("d-none");
        DOMUtils_1.DOMUtils.get(".our-brand").classList.toggle("hide");
    }
    enableConferenceElements() {
        this.startButton.classList.add("hide");
        this.shareSlug.classList.remove("hide");
        this.startButton.classList.remove("hide");
        this.videoGrid.classList.add("d-flex");
        this.lockContext.classList.remove("hide");
        this.leaveCotext.classList.remove("hide");
        DOMUtils_1.DOMUtils.get(".fa-dungeon").classList.toggle("hide");
        DOMUtils_1.DOMUtils.get(".top-bar").classList.remove("d-none");
        DOMUtils_1.DOMUtils.get("#record").classList.remove("d-none");
        DOMUtils_1.DOMUtils.get("#share-file").classList.toggle("hide");
        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils_1.DOMUtils.get("#show-chat").classList.toggle("d-none");
        DOMUtils_1.DOMUtils.get(".our-brand").classList.toggle("hide");
        $("#slug").popover('hide');
        DOMUtils_1.DOMUtils.get(".remote").classList.remove("hide");
        DOMUtils_1.DOMUtils.get(".overlay").classList.add("d-none");
        DOMUtils_1.DOMUtils.get(".join").classList.add("d-none");
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
    if (!(location.href.includes("file://"))) { // temp hack for electron
        if (!(location.href.includes("https://") || location.href.includes("http://localhost")))
            location.href = location.href.replace("http://", "https://");
    }
    let instance = App.getInstance();
    window["kollo"] = instance;
});

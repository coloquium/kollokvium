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
        this.userSettings = new UserSettings_1.UserSettings();
        // see settings.json
        this.appDomain = new AppDomain_1.AppDomain();
        DOMUtils_1.DOMUtils.get("#appDomain").textContent = this.appDomain.domain;
        DOMUtils_1.DOMUtils.get("#appVersion").textContent = this.appDomain.version;
        this.mediaStreamBlender = new mediastreamblender_1.MediaStreamBlender();
        this.factory = this.connectToServer(this.appDomain.serverUrl, {});
        let blenderWaterMark = DOMUtils_1.DOMUtils.get("#watermark");
        this.mediaStreamBlender.onFrameRendered = (ctx) => {
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(blenderWaterMark, 10, 10, 100, 100);
            ctx.restore();
        };
        this.mediaStreamBlender.onTrack = () => {
            this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();
        };
        this.mediaStreamBlender.onRecordingStart = () => {
            this.sendMessage(this.userSettings.nickname, "I'm now recording the session.");
        };
        this.mediaStreamBlender.onRecordingEnded = (blobUrl) => {
            this.displayRecording(blobUrl);
        };
        this.mediaStreamBlender.onTrackEnded = () => {
            this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();
            this.mediaStreamBlender.refreshCanvas();
        };
        //Handle modal quick start early, if its been dismissed hide straight away
        //  if (this.userSettings.showQuickStart)
        // (Utils.$("#quick-start-container") as HTMLElement).classList.remove("hide");
        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            DOMUtils_1.DOMUtils.get(".only-desktop").classList.add("hide");
        }
        this.numOfChatMessagesUnread = 0;
        this.participants = new Map();
        this.dungeons = new Map();
        this.slug = location.hash.replace("#", "");
        this.fullScreenVideo = DOMUtils_1.DOMUtils.get(".full");
        this.shareContainer = DOMUtils_1.DOMUtils.get("#share-container");
        this.shareFile = DOMUtils_1.DOMUtils.get("#share-file");
        this.videoGrid = DOMUtils_1.DOMUtils.get("#video-grid");
        this.audioNode = DOMUtils_1.DOMUtils.get("#remtote-audio-node audio");
        this.lockContext = DOMUtils_1.DOMUtils.get("#context-lock");
        let slug = DOMUtils_1.DOMUtils.get("#slug");
        let startButton = DOMUtils_1.DOMUtils.get("#joinconference");
        let chatWindow = DOMUtils_1.DOMUtils.get(".chat");
        let chatMessage = DOMUtils_1.DOMUtils.get("#chat-message");
        let chatMessages = DOMUtils_1.DOMUtils.get("#chatmessages");
        let muteAudio = DOMUtils_1.DOMUtils.get("#mute-local-audio");
        let muteVideo = DOMUtils_1.DOMUtils.get("#mute-local-video");
        let muteSpeakers = DOMUtils_1.DOMUtils.get("#mute-speakers");
        let startScreenShare = DOMUtils_1.DOMUtils.get("#share-screen");
        let settings = DOMUtils_1.DOMUtils.get("#settings");
        let saveSettings = DOMUtils_1.DOMUtils.get("#save-settings");
        let unreadBadge = DOMUtils_1.DOMUtils.get("#unread-messages");
        let generateSlug = DOMUtils_1.DOMUtils.get("#generate-slug");
        let nickname = DOMUtils_1.DOMUtils.get("#txt-nick");
        let videoDevice = DOMUtils_1.DOMUtils.get("#sel-video");
        let audioDevice = DOMUtils_1.DOMUtils.get("#sel-audio");
        let videoResolution = DOMUtils_1.DOMUtils.get("#sel-video-res");
        // just set the value to saved key, as user needs to scan..
        let closeQuickstartButton = DOMUtils_1.DOMUtils.get("#close-quick-start");
        let helpButton = DOMUtils_1.DOMUtils.get("#help");
        DOMUtils_1.DOMUtils.get("#sel-video-res option").textContent = "Using dynamic resolution";
        let toogleRecord = DOMUtils_1.DOMUtils.get(".record");
        let testResolutions = DOMUtils_1.DOMUtils.get("#test-resolutions");
        nickname.value = this.userSettings.nickname;
        this.videoGrid.addEventListener("click", () => {
            this.videoGrid.classList.remove("blur");
            this.audioNode.muted = !this.audioNode.muted;
        });
        toogleRecord.addEventListener("click", () => {
            toogleRecord.classList.toggle("flash");
            toogleRecord.classList.toggle("red");
            this.mediaStreamBlender.render(25);
            this.mediaStreamBlender.record();
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
                }).catch(() => {
                    console.log("error");
                });
            });
        });
        settings.addEventListener("click", () => {
            console.log("!");
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
            startButton.disabled = false;
            $("#random-slug").popover("hide");
        });
        muteSpeakers.addEventListener("click", () => {
            muteSpeakers.classList.toggle("fa-volume-mute");
            muteSpeakers.classList.toggle("fa-volume-up");
            this.audioNode.muted = !this.audioNode.muted;
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
        if (this.slug.length >= 6) {
            slug.value = this.slug;
            startButton.disabled = false;
            DOMUtils_1.DOMUtils.get("#random-slug").classList.add("d-none"); // if slug predefined, no random option...
        }
        DOMUtils_1.DOMUtils.get("#close-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
            unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            unreadBadge.textContent = "0";
        });
        DOMUtils_1.DOMUtils.get("#show-chat").addEventListener("click", () => {
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
            startButton;
            startButton.textContent = "JOIN";
        }
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));
            }
            else {
                startButton.disabled = true;
            }
        });
        nickname.addEventListener("change", () => {
            this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
        });
        startButton.addEventListener("click", () => {
            this.videoGrid.classList.add("d-flex");
            this.lockContext.classList.remove("hide");
            DOMUtils_1.DOMUtils.get(".fa-dungeon").classList.toggle("hide");
            DOMUtils_1.DOMUtils.get(".top-bar").classList.remove("d-none");
            DOMUtils_1.DOMUtils.get("#record").classList.remove("d-none");
            $("#random-slug").popover("hide");
            DOMUtils_1.DOMUtils.get("#share-file").classList.toggle("hide");
            // Utils.$("#share-screen").classList.toggle("d-none");
            DOMUtils_1.DOMUtils.get("#show-chat").classList.toggle("d-none");
            DOMUtils_1.DOMUtils.get(".our-brand").remove();
            $("#slug").popover('hide');
            startButton.classList.add("hide");
            DOMUtils_1.DOMUtils.get(".remote").classList.remove("hide");
            DOMUtils_1.DOMUtils.get(".overlay").classList.add("d-none");
            DOMUtils_1.DOMUtils.get(".join").classList.add("d-none");
            this.userSettings.slugHistory.addToHistory(slug.value);
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
            broker.On("fileShare", (fileinfo, arrayBuffer) => {
                this.fileReceived(fileinfo, arrayBuffer);
            });
            broker.On("lockContext", () => {
                this.lockContext.classList.toggle("fa-lock-open");
                this.lockContext.classList.toggle("fa-lock");
            });
            broker.On("isRoomLocked", (data) => {
                startButton.disabled = data.state;
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
            broker.On("chatMessage", (im) => {
                this.numOfChatMessagesUnread++;
                let message = document.createElement("p");
                let sender = document.createElement("mark");
                message.textContent = im.text;
                sender.textContent = im.from;
                message.prepend(sender);
                chatMessages.prepend(message);
                if (chatWindow.classList.contains("d-none")) {
                    unreadBadge.classList.remove("d-none");
                    unreadBadge.textContent = this.numOfChatMessagesUnread.toString();
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
                DOMUtils_1.DOMUtils.get(".p" + peer.id).remove();
                this.participants.delete(peer.id);
            };
            this.rtcClient.OnContextConnected = (peer) => {
                DOMUtils_1.DOMUtils.get(".remote").classList.add("hide");
            };
            this.rtcClient.OnRemoteTrack = (track, connection) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track, (el) => {
                    this.mediaStreamBlender.addTracks(`audio-${connection.id}`, [track], false);
                });
                participant.onVideoTrackLost = (id, stream, track) => {
                    let p = DOMUtils_1.DOMUtils.get(".p" + id);
                    if (p)
                        p.remove();
                    // todo:  Remove from blender..
                };
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
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(mediaStream);
                    this.addLocalVideo(mediaStream);
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
     * Adds a fileshare message to chat, when someone shared a file...
     *
     * @param {*} fileinfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    fileReceived(fileinfo, arrayBuffer) {
        const p = document.createElement("p");
        p.textContent = "Hey,here is shared file, click to download.. ";
        const blobUrl = window.URL.createObjectURL(new Blob([arrayBuffer], {
            type: fileinfo.mimeType
        }));
        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = fileinfo.name;
        download.setAttribute("download", fileinfo.name);
        p.append(download);
        DOMUtils_1.DOMUtils.get("#chatmessages").prepend(p);
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
            DOMUtils_1.DOMUtils.get("#share-screen").classList.add("hide");
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
    recordSinglestream(id, mediaStream) {
        if (!this.isRecording) {
            this.singleStreamRecorder = new mediastreamblender_1.MediaStreamRecorder(mediaStream.getTracks());
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
    /**
     *
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
    addLocalVideo(mediaStream) {
        let video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.classList.add("l-" + mediaStream.id);
        video.srcObject = mediaStream;
        let container = DOMUtils_1.DOMUtils.get(".local");
        container.append(video);
        // and local stream to mixer / blender;
        this.mediaStreamBlender.addTracks(mediaStream.id, mediaStream.getTracks(), true);
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
        this.factory.GetController("broker").Invoke("chatMessage", data);
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
        console.log("addRemoteVideo", id, mediaStream);
        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let videoTools = document.createElement("div");
        videoTools.classList.add("video-tools", "p2", "darken");
        let item = document.createElement("li");
        item.setAttribute("class", "p" + id);
        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "white");
        let r = document.createElement("i");
        r.classList.add("fas", "fa-circle", "fa-2x", "red");
        r.addEventListener("click", () => {
            if (!this.isRecording)
                r.classList.add("flash", "is-recordig");
            this.recordSinglestream(id, mediaStream);
        });
        videoTools.append(f);
        videoTools.append(r);
        item.prepend(videoTools);
        let video = document.createElement("video");
        video.srcObject = mediaStream;
        video.width = 1280;
        video.height = 720;
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
            this.audioNode.muted = true;
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
                this.mediaStreamBlender.addTracks(id, [mediaStreamTrack], false);
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
    if (!(location.href.includes("file://"))) { // temp hack for electron
        if (!(location.href.includes("https://") || location.href.includes("http://localhost")))
            location.href = location.href.replace("http://", "https://");
    }
    App.getInstance();
});

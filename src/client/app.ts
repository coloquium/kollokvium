import adapter from 'webrtc-adapter';
import { Factory, WebRTC, BinaryMessage, Message, DataChannel, PeerChannel, Utils } from 'thor-io.client-vnext'
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipant } from './AppParticipant';
import { PeerConnection } from 'thor-io.vnext';
import { ReadFile } from './Helpers/ReadFile';
import { UserSettings } from './UserSettings';
import { AppDomain } from './AppDomain';
import { MediaStreamBlender, MediaStreamRecorder, StreamSource } from 'mediastreamblender'
import { DetectResolutions } from './Helpers/DetectResolutions';
import { AppComponentToaster } from './Components/AppComponentToaster';
import { DungeonComponent } from './Components/DungeonComponent';
import { DOMUtils } from './Helpers/DOMUtils';
import { WebRTCConnection } from 'thor-io.client-vnext/src/WebRTC/WebRTCConnection';
import { GreenScreenComponent } from './Components/GreenScreenComponent';
import { AudioNodes } from './Audio/AudioNodes';
import { Subtitles } from './Audio/Subtitles';
export class App {

    appDomain: AppDomain;
    userSettings: UserSettings;
    greenScreen: GreenScreenComponent;
    mediaStreamBlender: MediaStreamBlender;
    audioNodes: AudioNodes;
    fileChannel: DataChannel;
    arbitraryChannel: DataChannel;

    dungeons: Map<string, DungeonComponent>;
    singleStreamRecorder: MediaStreamRecorder
    factory: Factory;
    rtcClient: WebRTC;
    localMediaStream: MediaStream;
    slug: string;
    participants: Map<string, AppParticipant>;
    isRecording: boolean;
    transcriber: Subtitles;
    preferedLanguage: string;

    numOfChatMessagesUnread: number;

    shareContainer: HTMLElement;
    videoGrid: HTMLElement;
    fullScreenVideo: HTMLVideoElement;
    shareFile: HTMLElement;
    chatWindow: HTMLElement;
    unreadBadge: HTMLElement;
    leaveCotext: HTMLElement;
    startButton: HTMLInputElement;
    shareSlug: HTMLElement;
    lockContext: HTMLElement;
    generateSubtitles: HTMLElement;

    languagePicker: HTMLInputElement;
    pictueInPicture: HTMLElement;
    pictureInPictureElement: HTMLVideoElement;
    /**
     *
     *
     * @memberof App
     */
    testCameraResolutions() {
        let parent = DOMUtils.get("#sel-video-res");
        parent.innerHTML = "";
        let deviceId = (DOMUtils.get("#sel-video") as HTMLInputElement).value;
        DetectResolutions.testResolutions(deviceId == "" ? undefined : deviceId, (result) => {
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
    getLocalStream(constraints: MediaStreamConstraints, cb: Function) {
        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream: MediaStream) => {

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
    displayReceivedFile(fileinfo: any, blob: Blob) {
        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils.linkify("Hey,the file is ready to download, click to download ");
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

        DOMUtils.get("#chatmessages").prepend(message);
    }

    /**
     * Add a chat messge to the chat window
     *
     * @param {*} msg
     * @memberof App
     */
    displayChatMessage(msg: any) {
        let chatMessages = DOMUtils.get("#chatmessages") as HTMLElement;
        this.numOfChatMessagesUnread++;
        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils.linkify(msg.text);


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
    sendFile(file: any) {
        if (!file) return;
        let sendprogress = document.querySelector(".progress-bar");
        sendprogress.setAttribute("aria-valuenow", "0")
        sendprogress.setAttribute("aria-valuemax", file.siz)
        let meta = {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            sender: this.userSettings.nickname
        };
        const shareId = Utils.newGuid();
        ReadFile.readChunks(file, (data, bytes, isFinal) => {
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
        navigator.mediaDevices["getDisplayMedia"](gdmOptions).then((stream: MediaStream) => {
            stream.getVideoTracks().forEach((t: MediaStreamTrack) => {
                this.rtcClient.LocalStreams[0].addTrack(t);
                this.rtcClient.addTrackToPeers(t);
            });
            this.addLocalVideo(stream, false);
        }).catch(err => console.error)
    }

    /**
     * Mute local video  ( self )
     *
     * @param {*} evt
     * @memberof App
     */
    muteVideo(evt: any): void {
        let el = evt.target as HTMLElement;
        el.classList.toggle("fa-video");
        el.classList.toggle("fa-video-slash")
        let mediaTrack = this.localMediaStream.getVideoTracks();
        mediaTrack.forEach((track: MediaStreamTrack) => {
            track.enabled = !track.enabled;
        });
    }
    /**
     * Mute local video ( self )
     *
     * @param {*} evt
     * @memberof App
     */
    muteAudio(evt: any): void {
        let el = evt.target as HTMLElement;
        el.classList.toggle("fa-microphone");
        el.classList.toggle("fa-microphone-slash")
        let mediaTrack = this.localMediaStream.getAudioTracks();
        mediaTrack.forEach((track: MediaStreamTrack) => {
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
    recordSingleStream(id: string) {
        if (!this.isRecording) {
            let tracks = this.participants.get(id).getTracks();
            this.singleStreamRecorder = new MediaStreamRecorder(tracks);
            this.singleStreamRecorder.start(10);
            this.isRecording = true;
        } else {
            DOMUtils.get("i.is-recordig").classList.remove("flash");
            this.isRecording = false;
            this.singleStreamRecorder.stop();
            this.singleStreamRecorder.flush().then((blobUrl: string) => {
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

            Array.from(this.participants.values()).forEach((p: AppParticipant) => {
                this.mediaStreamBlender.addTracks(p.id, p.videoTracks.concat(p.audioTracks), false);
            });
            this.mediaStreamBlender.addTracks("self", this.localMediaStream.getTracks(), true)

            this.mediaStreamBlender.refreshCanvas();
            this.mediaStreamBlender.render(25);
            this.mediaStreamBlender.record();


        } else {
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
    displayRecording(blobUrl: string) {
        let p = document.createElement("p");

        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = "Your recording has ended, here is the file. ( click to download )";
        download.setAttribute("download", `${Math.random().toString(36).substring(6)}.webm`);

        p.append(download);

        DOMUtils.get("#recorder-download").append(p);

        $("#recorder-result").modal("show");

    }

    /**
     * Add a local media stream to the UI
     *
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addLocalVideo(mediaStream: MediaStream, isCam: boolean) {
        let video = document.createElement("video") as HTMLVideoElement;

        video.autoplay = true;
        video.muted = true;
        video.classList.add("l-" + mediaStream.id);
        video.srcObject = mediaStream;

        mediaStream.getVideoTracks()[0].onended = () => {
            this.arbitraryChannel.Invoke("streamChange", { id: mediaStream.getVideoTracks()[0].id });
            DOMUtils.get(".l-" + mediaStream.id).remove();
        }

        if (isCam) video.classList.add("local-cam");

        let container = DOMUtils.get(".local") as HTMLElement;
        container.append(video);



    }

    /**
     * PeerConnection configuration
     *
     * @memberof App
     */
    rtcConfig = {
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

    /**
     * Send chat message
     *
     * @param {string} sender
     * @param {string} message
     * @memberof App
     */
    sendMessage(sender: string, message: string) {
        if (sender.length == 0) sender = "NoName"
        const data = {
            text: message,
            from: sender
        }
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
    connectToServer(url: string, config: any): Factory {
        return new Factory(url, ["broker"]);
    }

    /**
     * Add remote video stream 
     *
     * @param {string} id
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addRemoteVideo(id: string, mediaStream: MediaStream, trackId: string) {

        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let videoTools = document.createElement("div");
        videoTools.classList.add("video-tools", "p2", "darken");
        let item = document.createElement("li");

        item.classList.add("p" + id);

        item.classList.add("s" + trackId);

        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "white")
        let r = document.createElement("i");
        r.classList.add("fas", "fa-circle", "fa-2x", "red")
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

        let subtitles = document.createElement("div");
        subtitles.classList.add("subtitles");
        subtitles.classList.add("subs" + id);

        item.append(subtitles);
        item.append(video);
        // listener for fulscreen view of a participants video
        f.addEventListener("click", (e) => {
            let elem = video;
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
        DOMUtils.get("#remote-videos").append(item);
    }

    /**
     *
     *
     * @param {string} key
     * @memberof App
     */
    addDungeon(key: string) {
        let d = new DungeonComponent(key);
        this.dungeons.set(key, d);
        d.render(DOMUtils.get(".dungeons"));
        DOMUtils.get("#dungeon-" + key + " i").addEventListener("click", () => {
            d.destroy((peers: Array<string>) => {
                peers.forEach((peerId: string) => {
                    this.factory.GetController("broker").Invoke("leaveDungeon", {
                        key: d.id,
                        peerId: peerId
                    });
                });
                this.dungeons.delete(key);
                DOMUtils.get("#dungeon-" + key).remove();
            });
        });

        DOMUtils.get("#dungeon-" + key).addEventListener("click", () => {
            DOMUtils.get(".video-grid").classList.add("blur");
            DOMUtils.get(".dungeons-header").classList.add("flash");

        });
        if (DOMUtils.get(".dungeons").classList.contains("d-none")) {
            DOMUtils.get(".dungeons").classList.remove("d-none");
        }

    }

    /**
     * Get this clients media devices
     *
     * @returns {Promise<Array<MediaDeviceInfo>>}
     * @memberof App
     */
    getMediaDevices(): Promise<Array<MediaDeviceInfo>> {
        return new Promise<Array<MediaDeviceInfo>>((resolve: any, reject: any) => {
            navigator.mediaDevices.enumerateDevices().then((devices: Array<MediaDeviceInfo>) => {
                resolve(devices);
            }).catch(reject);
        });
    };
    /**
     *  Add aparticipant to the "conference"
     *
     * @param {string} id
     * @returns {AppParticipant}
     * @memberof App
     */
    tryAddParticipant(id: string): AppParticipant {
        if (this.participants.has(id)) {
            return this.participants.get(id);
        } else {
            this.participants.set(id, new AppParticipant(id));
            let p = this.participants.get(id);
            p.onVideoTrackAdded = (id: string, mediaStream: MediaStream, mediaStreamTrack: MediaStreamTrack) => {
                this.addRemoteVideo(id, mediaStream, mediaStreamTrack.id);
            }
            p.onAudioTrackAdded = (id: string, mediaStream: MediaStream, mediaStreamTrack: MediaStreamTrack) => {
                this.audioNodes.add(id, mediaStream);
            };
            p.onVideoTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                let p = DOMUtils.get(".p" + id);
                if (p) p.remove();
            }
            p.onAudioTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                this.audioNodes.remove(id);
            }
            return p;
        }
    }


    addSubtitles(parent: HTMLElement, text: string, lang) {
        if (parent) {
            let p = document.createElement("p");
            p.onanimationend = () => {
                p.remove();
            };
            p.textContent = text;
            parent.append(p);
        }
    }

    disableConfrenceElements() {
        location.hash = "";
        let slug = DOMUtils.get("#slug") as HTMLInputElement;

        if('pictureInPictureEnabled' in document)
        this.pictueInPicture.classList.toggle("hide");

        slug.value = "";

        DOMUtils.get("#random-slug").classList.remove("d-none");


        this.videoGrid.classList.remove("d-flex");
        this.lockContext.classList.add("hide");
        this.leaveCotext.classList.add("hide");

        this.startButton.disabled = true;
        this.startButton.classList.remove("hide");
        this.shareSlug.classList.add("hide");



        DOMUtils.get(".fa-dungeon").classList.add("hide");
        DOMUtils.get(".top-bar").classList.add("d-none");

        DOMUtils.get("#record").classList.add("d-none");


        DOMUtils.get("#share-file").classList.toggle("hide");
        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils.get("#show-chat").classList.toggle("d-none");

        DOMUtils.get(".remote").classList.add("hide");

        DOMUtils.get(".overlay").classList.remove("d-none");
        DOMUtils.get(".join").classList.remove("d-none");
        DOMUtils.get(".our-brand").classList.toggle("hide");

    }


    enableConferenceElements() {

        if('pictureInPictureEnabled' in document)
            this.pictueInPicture.classList.toggle("hide");
        this.startButton.classList.add("hide");
        this.generateSubtitles.classList.toggle("hide");

        this.shareSlug.classList.remove("hide");


        this.startButton.classList.remove("hide");
        this.videoGrid.classList.add("d-flex");

        this.lockContext.classList.remove("hide");

        this.leaveCotext.classList.remove("hide");

        DOMUtils.get(".fa-dungeon").classList.toggle("hide");
        DOMUtils.get(".top-bar").classList.remove("d-none");

        DOMUtils.get("#record").classList.remove("d-none");

        DOMUtils.get("#share-file").classList.toggle("hide");
        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils.get("#show-chat").classList.toggle("d-none");
        DOMUtils.get(".our-brand").classList.toggle("hide");

        $("#slug").popover('hide');

        DOMUtils.get(".remote").classList.remove("hide");

        DOMUtils.get(".overlay").classList.add("d-none");
        DOMUtils.get(".join").classList.add("d-none");
    }

    /**
     * Creates an instance of App - Kollokvium
     * @memberof App
     */
    constructor() {

        this.appDomain = new AppDomain();

        this.factory = this.connectToServer(this.appDomain.serverUrl, {})


        this.userSettings = new UserSettings();

        // add language options to UserSettings 

        DOMUtils.get("#langaues").append(Subtitles.getlanguagePicker());




        DOMUtils.get("#appDomain").textContent = this.appDomain.domain;
        DOMUtils.get("#appVersion").textContent = this.appDomain.version;

        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            DOMUtils.get(".only-desktop").classList.add("hide");
        }


        this.audioNodes = new AudioNodes();

        this.mediaStreamBlender = new MediaStreamBlender();


        let blenderWaterMark = DOMUtils.get("#watermark") as HTMLImageElement;
        this.mediaStreamBlender.onFrameRendered = (ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(blenderWaterMark, 10, 10, 100, 100);
            ctx.restore();
        }
        this.mediaStreamBlender.onTrack = () => {
            // this.audioNode.srcObject = this.mediaStreamBlend"transer.getRemoteAudioStream();
        }
        this.mediaStreamBlender.onRecordingStart = () => {
            this.sendMessage(this.userSettings.nickname, "I'm now recording the session.");
        }
        this.mediaStreamBlender.onRecordingEnded = (blobUrl: string) => {
            this.displayRecording(blobUrl);
        };
        this.mediaStreamBlender.onTrackEnded = () => {
            try{
                this.mediaStreamBlender.refreshCanvas();
            }catch(err){
                console.log(err);
            }           
        }
        this.greenScreen = new GreenScreenComponent("gss");
        this.greenScreen.onApply = (mediaStream) => {
            DOMUtils.get("video#preview").remove()
            let a = this.localMediaStream.getVideoTracks()[0];
            this.localMediaStream.removeTrack(a);
            this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
            DOMUtils.get("#apply-virtualbg").classList.toggle("hide");
            DOMUtils.get("#remove-virtualbg").classList.toggle("hide");

        };

        DOMUtils.get("#components").append(this.greenScreen.render());


        this.numOfChatMessagesUnread = 0;
        this.participants = new Map<string, AppParticipant>();
        this.dungeons = new Map<string, DungeonComponent>();

        this.slug = location.hash.replace("#", "");

        this.generateSubtitles = DOMUtils.get("#subtitles") as HTMLElement;

        this.fullScreenVideo = DOMUtils.get(".full") as HTMLVideoElement;
        this.shareContainer = DOMUtils.get("#share-container");
        this.shareFile = DOMUtils.get("#share-file") as HTMLElement;
        this.videoGrid = DOMUtils.get("#video-grid") as HTMLElement;
        this.chatWindow = DOMUtils.get(".chat") as HTMLElement;

        this.lockContext = DOMUtils.get("#context-lock") as HTMLElement;
        this.unreadBadge = DOMUtils.get("#unread-messages") as HTMLElement;
        this.leaveCotext = DOMUtils.get("#leave-context");
        this.startButton = DOMUtils.get("#joinconference") as HTMLInputElement;
        this.shareSlug = DOMUtils.get("#share-slug");

        this.languagePicker = DOMUtils.get(".selected-language") as HTMLInputElement;


        this.pictueInPicture = DOMUtils.get("#pip") as HTMLElement;


        let slug = DOMUtils.get("#slug") as HTMLInputElement;
        let chatMessage = DOMUtils.get("#chat-message") as HTMLInputElement;
        let muteAudio = DOMUtils.get("#mute-local-audio") as HTMLElement;
        let muteVideo = DOMUtils.get("#mute-local-video") as HTMLElement;
        let muteSpeakers = DOMUtils.get("#mute-speakers") as HTMLElement;
        let startScreenShare = DOMUtils.get("#share-screen") as HTMLElement;
        let settings = DOMUtils.get("#settings") as HTMLElement;
        let saveSettings = DOMUtils.get("#save-settings") as HTMLElement;
        let generateSlug = DOMUtils.get("#generate-slug") as HTMLHtmlElement
        let nickname = DOMUtils.get("#txt-nick") as HTMLInputElement;
        let videoDevice = DOMUtils.get("#sel-video") as HTMLInputElement;
        let audioDevice = DOMUtils.get("#sel-audio") as HTMLInputElement;
        let videoResolution = DOMUtils.get("#sel-video-res") as HTMLInputElement;
        // just set the value to saved key, as user needs to scan..
        let closeQuickstartButton = DOMUtils.get("#close-quick-start") as HTMLInputElement;
        let helpButton = DOMUtils.get("#help") as HTMLInputElement;

        DOMUtils.get("#sel-video-res option").textContent = "Using dynamic resolution";

        DOMUtils.get("#apply-virtualbg").addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
            const track = this.localMediaStream.getVideoTracks()[0]
            track.applyConstraints({ width: 800, height: 450 });
            this.greenScreen.setMediaTrack(track);
            $("#gss").modal("toggle");
        });

        DOMUtils.get("#remove-virtualbg").addEventListener("click", () => {
            this.getLocalStream(UserSettings.defaultConstraints, (mediaStream: MediaStream) => {
                const track = this.localMediaStream.getVideoTracks()[0];
                this.localMediaStream.removeTrack(track);
                this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
                DOMUtils.get("#apply-virtualbg").classList.toggle("hide");
                DOMUtils.get("#remove-virtualbg").classList.toggle("hide");
                this.greenScreen.stop();
            });
        });

        DOMUtils.makeDragable(DOMUtils.get(".local"));

        let toogleRecord = DOMUtils.get("#record-all") as HTMLAudioElement;

        let testResolutions = DOMUtils.get("#test-resolutions") as HTMLButtonElement;

        this.pictureInPictureElement = DOMUtils.get("#pip-stream") as HTMLVideoElement;

        this.pictureInPictureElement.addEventListener('enterpictureinpicture', () => {
            this.pictureInPictureElement.play();
            this.pictueInPicture.classList.toggle("flash");

           
        });

        this.pictureInPictureElement.addEventListener('leavepictureinpicture', () => {
            this.pictueInPicture.classList.toggle("flash");
            this.mediaStreamBlender.render(0);           
            this.mediaStreamBlender.audioSources.clear();
            this.mediaStreamBlender.videosSources.clear();
            this.pictueInPicture.classList.toggle("flash");
            this.pictureInPictureElement.pause();
        });         

        this.pictueInPicture.addEventListener("click", () => {

            if (this.isRecording) return;
            this.pictueInPicture.classList.toggle("flash");


            if (document["pictureInPictureElement"]) {
                document["exitPictureInPicture"]()
                    .catch(error => {
                        // Error handling
                    })
            } else {           
                this.mediaStreamBlender.audioSources.clear();
                this.mediaStreamBlender.videosSources.clear();
    
                Array.from(this.participants.values()).forEach((p: AppParticipant) => {
                    this.mediaStreamBlender.addTracks(p.id, p.videoTracks.concat(p.audioTracks), false);
                });
                this.mediaStreamBlender.addTracks("self", this.localMediaStream.getTracks(), true)

    
                this.mediaStreamBlender.refreshCanvas();
                
                this.mediaStreamBlender.render(15);
                this.pictureInPictureElement.onloadeddata = () =>{
                    this.pictureInPictureElement["requestPictureInPicture"]();
                }
                this.pictureInPictureElement.srcObject =  this.mediaStreamBlender.captureStream();


        
            
              

            }
        });

        nickname.value = this.userSettings.nickname;
        this.languagePicker.value = this.userSettings.language;


        this.videoGrid.addEventListener("click", () => {
            this.videoGrid.classList.remove("blur");
        });


        testResolutions.addEventListener("click", () => {
            this.testCameraResolutions();
        })

        this.lockContext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("lockContext", {});
        });


        this.getMediaDevices().then((devices: Array<MediaDeviceInfo>) => {
            let inputOnly = devices.filter(((d: MediaDeviceInfo) => {
                return d.kind.indexOf("input") > 0
            }));
            inputOnly.forEach((d: MediaDeviceInfo, index: number) => {
                let option = document.createElement("option");
                option.textContent = d.label || `Device #${index} (name unknown)`;
                option.value = d.deviceId;
                if (d.kind == "videoinput") {
                    if (option.value == this.userSettings.videoDevice) option.selected = true;
                    DOMUtils.get("#sel-video").append(option);
                } else {
                    if (option.value == this.userSettings.audioDevice) option.selected = true;
                    DOMUtils.get("#sel-audio").append(option);
                }
            });
            devices.filter(((d: MediaDeviceInfo) => {
                return d.kind.indexOf("output") > 0
            })).forEach(((d: MediaDeviceInfo) => {
                let option = document.createElement("option");
                option.textContent = d.label || d.kind;
                option.setAttribute("value", d.deviceId);
                DOMUtils.get("#sel-audio-out").append(option);
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

            this.localMediaStream.getVideoTracks().forEach((track: MediaStreamTrack) => {
                track.applyConstraints(constraints["video"] as MediaTrackConstraints).then(() => {
                }).catch((e) => {
                    console.error(e);
                });
            });

            $("#settings-modal").modal("toggle");

        });
        settings.addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
        })

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
            $(".file-selected").on("change", (evt: any) => {
                const file = evt.target.files[0];
                this.sendFile(file);
            });
        });

        DOMUtils.get("#create-dungeon").addEventListener("click", () => {
            $("#modal-dungeon").modal("toggle");
            let container = DOMUtils.get(".dungeon-thumbs");
            container.innerHTML = "";
            // get a new list of participants , and show thumbs
            this.participants.forEach((p: AppParticipant) => {
                p.captureImage().then((i: ImageBitmap) => {
                    let canvas = document.createElement("canvas");
                    canvas.height = i.height; canvas.width = i.width;
                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(i, 0, 0, i.width, i.height);
                    canvas.dataset.peerId = p.id;
                    canvas.addEventListener("click", () => {
                        canvas.classList.toggle("dungeon-paricipant");
                    });
                    container.append(canvas);
                })
            });
        });

        DOMUtils.get("button#invite-dungeon").addEventListener("click", () => {
            DOMUtils.get(".dungeons").classList.remove("d-none");
            $("#modal-dungeon").modal("toggle");
            let peers = new Array<string>();
            DOMUtils.getAll(".dungeon-paricipant").forEach((el: HTMLElement) => {
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

        this.userSettings.slugHistory.getHistory().forEach((slug: string) => {
            const option = document.createElement("option");
            option.setAttribute("value", slug);
            DOMUtils.get("#slug-history").prepend(option);
        });

        generateSlug.addEventListener("click", () => {
            slug.value = Math.random().toString(36).substring(2).toLocaleLowerCase();
            this.startButton.disabled = false;
            $("#random-slug").popover("hide");
        });


        this.generateSubtitles.addEventListener("click", () => {
            this.generateSubtitles.classList.toggle("flash");

            if (!this.transcriber) {
                this.transcriber = new Subtitles(this.rtcClient.LocalPeerId,
                    new MediaStream(this.rtcClient.LocalStreams[0].getAudioTracks()), this.preferedLanguage
                );
                this.transcriber.onFinal = (peerId, result, lang) => {
                    this.arbitraryChannel.Invoke("transcript", {
                        peerId: peerId,
                        text: result,
                        lang: lang
                    });
                }
                this.transcriber.start();
                this.transcriber.onIdle = () => {              
                }
            } else {
                if (this.transcriber)

                    this.transcriber.stop();
                this.transcriber = null;
            }
        });


        muteSpeakers.addEventListener("click", () => {
            muteSpeakers.classList.toggle("fa-volume-mute");
            muteSpeakers.classList.toggle("fa-volume-up");
            this.audioNodes.toggleMuteAll();
        });

        muteAudio.addEventListener("click", (e) => {
            this.muteAudio(e)
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e)
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
        })


        DOMUtils.get("button#share-link").addEventListener("click", (e: any) => {
            navigator.clipboard.writeText(`${this.appDomain.host}/#${slug.value}`).then(() => {
                e.target.textContent = "Done!"
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
            DOMUtils.get("#random-slug").classList.add("d-none"); // if slug predefined, no random option...
        }

        DOMUtils.get("#close-chat").addEventListener("click", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            this.unreadBadge.textContent = "0";

        });
        DOMUtils.get("#show-chat").addEventListener("click", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numOfChatMessagesUnread = 0;
            this.unreadBadge.textContent = "0";
        });


        this.languagePicker.addEventListener("change", () => {

            this.userSettings.language = this.languagePicker.value;

            this.userSettings.saveSetting();

            this.preferedLanguage = this.userSettings.language;


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

            } else {
                this.startButton.disabled = true;
            }
        });


        nickname.addEventListener("change", () => {
            this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
        });

        this.leaveCotext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("leaveContext", {})
        })

        this.startButton.addEventListener("click", () => {
            this.enableConferenceElements();
            this.userSettings.slugHistory.addToHistory(slug.value);
            window.history.pushState({}, window.document.title, `#${slug.value}`);
            this.userSettings.saveSetting();


            this.rtcClient.ChangeContext(this.appDomain.getSlug(slug.value));

        });


        chatMessage.addEventListener("keydown", (e) => {
            if (e.keyCode == 13) {
                this.sendMessage(this.userSettings.nickname, chatMessage.value)
                chatMessage.value = "";
            }
        });


        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {

            this.rtcClient = new WebRTC(broker, this.rtcConfig);

            // set up peer dataChannels 
            this.arbitraryChannel = this.rtcClient.CreateDataChannel(`chat-${this.appDomain.contextPrefix}-dc`);
            this.fileChannel = this.rtcClient.CreateDataChannel(`file-${this.appDomain.contextPrefix}-dc`);


            this.fileChannel.On("fileShare", (fileinfo: any, arrayBuffer: ArrayBuffer) => {
                this.displayReceivedFile(fileinfo, new Blob([arrayBuffer], {
                    type: fileinfo.mimeType
                }));
            });






            this.arbitraryChannel.On("transcript", (data: any) => {


                this.addSubtitles(DOMUtils.get(`.subs${data.peerId}`), data.text, data.lang);



            });

            this.arbitraryChannel.On("streamChange", (data: any) => {
                let el = DOMUtils.get(".s" + data.id);
                if (el) el.remove();
            });


            this.arbitraryChannel.On("chatMessage", (data: any) => {
                this.displayChatMessage(data);
            });

            this.arbitraryChannel.OnOpen = (e, peerId) => {
            };

            broker.On("leaveContext", (data: any) => {
                this.rtcClient.Peers.forEach((connection: WebRTCConnection) => {
                    connection.RTCPeer.close();
                });
                this.participants.clear();
                DOMUtils.get("#remote-videos").innerHTML = "";
                this.disableConfrenceElements();
            });


            // broker.On("fileShare", (fileinfo: any, arrayBuffer: ArrayBuffer) => {
            //     this.displayReceivedFile(fileinfo, arrayBuffer)
            // });

            broker.On("lockContext", () => {
                this.lockContext.classList.toggle("fa-lock-open");
                this.lockContext.classList.toggle("fa-lock");
            });

            broker.On("isRoomLocked", (data: any) => {
                this.startButton.disabled = data.state;
                if (data.state) {
                    slug.classList.add("is-invalid");
                } else {
                    slug.classList.remove("is-invalid");
                }
            });

            broker.On("leaveDungeon", (data: any) => {
                this.dungeons.get(data.key).removeParticipant(data.peerId);
            });

            broker.On("inviteDungeon", (invite: any) => {
                let toast = AppComponentToaster.dungeonToaster(
                    "Dungeon invite", "Someone in the meeting created a dungeon...");
                let node = toast.children[0] as HTMLElement;
                node.dataset.peerId = invite.peerId;
                toast.querySelector(".btn-primary").addEventListener("click", (el: any) => {
                    this.factory.GetController("broker").Invoke("acceptDungeon", invite);
                    this.addDungeon(invite.key);
                    node.remove();
                    try {
                        this.dungeons.get(invite.key).addDungeonParticipant(this.participants.get(invite.creator));
                    } catch (e) {
                        console.log(e);
                    }
                });

                toast.querySelector(".btn-danger").addEventListener("click", (el: any) => {
                    this.factory.GetController("broker").Invoke("declineDungeon", invite);
                    node.remove();
                });
                DOMUtils.get(".toasters").prepend(toast);
                $(".toast").toast("show");

            });

            broker.On("acceptDungeon", (data) => {
                let d = this.dungeons.get(data.key);
                try {
                    d.addDungeonParticipant(this.participants.get(data.peerId));
                } catch (e) {
                    console.log(e);
                }
            });

            broker.On("chatMessage", (data: any) => {
                this.displayChatMessage(data);
            });

            this.rtcClient.OnLocalStream = (mediaStream: MediaStream) => {
            }
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {

            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();

            }
            this.rtcClient.OnContextDisconnected = (peer) => {
                DOMUtils.get(".p" + peer.id).remove();
                this.participants.delete(peer.id);
            };
            this.rtcClient.OnContextConnected = (peer) => {
                DOMUtils.get(".remote").classList.add("hide");
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track);
            }
            this.rtcClient.OnContextCreated = function (ctx: PeerConnection) {
                // noop
            }
            broker.OnOpen = (ci: any) => {


                if (slug.value.length >= 6) {
                    this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));
                }

                this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);

                //this.userSettings.createConstraints(this.userSettings.videoResolution)
                this.getLocalStream(
                    UserSettings.defaultConstraints,
                    (mediaStream: MediaStream) => {
                        DOMUtils.get("#await-streams").classList.toggle("hide");
                        DOMUtils.get("#has-streams").classList.toggle("hide");
                        this.localMediaStream = mediaStream;
                        this.rtcClient.AddLocalStream(this.localMediaStream);
                        this.addLocalVideo(this.localMediaStream, true);

                        if (location.hash.length <= 6)
                            $("#random-slug").popover("show");

                    });



            }
            broker.Connect();
        };
    }
    static getInstance(): App {
        return new App()
    }
}
/*
    Launch the application
*/
document.addEventListener("DOMContentLoaded", () => {

    if (!(location.href.includes("file://"))) { // temp hack for electron
        if (!(location.href.includes("https://") || location.href.includes("http://localhost"))) location.href = location.href.replace("http://", "https://")
    }

    let instance = App.getInstance();

});
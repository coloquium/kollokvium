import adapter from 'webrtc-adapter';
import { Factory, WebRTC, BinaryMessage, Message, Utils } from 'thor-io.client-vnext'
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipant } from './AppParticipant';
import { PeerConnection } from 'thor-io.vnext';
import { ReadFile } from './Helpers/ReadFile';
import { UserSettings } from './UserSettings';
import { AppDomain } from './AppDomain';
import { MediaStreamBlender, MediaStreamRecorder } from 'mediastreamblender'
import { DetectResolutions } from './Helpers/DetectResolutions';
import { AppComponentToaster } from './Components/AppComponentToaster';
import { DungeonComponent } from './Components/DungeonComponent';



export class App {
    appDomain: AppDomain;
    videoGrid: HTMLElement;
    audioNode: HTMLAudioElement;
    dungeons: Map<string, DungeonComponent>;
    lockContext: HTMLElement;
    singleStreamRecorder: MediaStreamRecorder
    shareFile: HTMLElement;
    factory: Factory;
    rtcClient: WebRTC;
    localMediaStream: MediaStream;
    Slug: string;
    participants: Map<string, AppParticipant>;
    shareContainer: any;
    fullScreenVideo: HTMLVideoElement;
    peerId: any;
    numOfChatMessagesUnread: number;
    userSettings: UserSettings;
    mediaStreamBlender: MediaStreamBlender;

    /**
     *
     *
     * @memberof App
     */
    testCameraResolutions() {
        let parent = document.querySelector("#sel-video-res");
        parent.innerHTML = "";
        let deviceId = (document.querySelector("#sel-video") as HTMLInputElement).value;

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
     * Adds a fileshare message to chat, when someone shared a file...
     *
     * @param {*} fileinfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    fileReceived(fileinfo: any, arrayBuffer: ArrayBuffer) {

        const p = document.createElement("p");
        p.textContent = "Hey,here is shared file, click to download.. ";

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
    sendFile(fileInfo: any, buffer: ArrayBuffer) {

        var message = new Message("fileShare",
            fileInfo, "broker", buffer);
        let bm = new BinaryMessage(message.toString(), buffer);
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
        navigator.mediaDevices["getDisplayMedia"](gdmOptions).then((stream: MediaStream) => {
            stream.getVideoTracks().forEach((t: MediaStreamTrack) => {
                this.rtcClient.LocalStreams[0].addTrack(t);
            });
            this.addLocalVideo(stream);
            document.querySelector("#share-screen").classList.add("hide")
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



    isRecording:boolean;
    /**
     *
     *
     * @param {string} id
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    recordSinglestream(id: string, mediaStream: MediaStream) {
        if (!this.isRecording) {
            this.singleStreamRecorder = new MediaStreamRecorder(mediaStream.getTracks());
            this.singleStreamRecorder.start(10);
             this.isRecording = true;
        } else {
            document.querySelector("i.is-recordig").classList.remove("flash");
            this.isRecording = false;
            this.singleStreamRecorder.stop();
            this.singleStreamRecorder.flush().then((blobUrl: string) => {
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
    displayRecording(blobUrl: string) {
        let p = document.createElement("p");

        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = "Your recording has ended, here is the file. ( click to download )";
        download.setAttribute("download", `${Math.random().toString(36).substring(6)}.webm`);

        p.append(download);

        document.querySelector("#recorder-download").append(p);

        $("#recorder-result").modal("show");
        
       

            

    }

    /**
     * Add a local media stream to the UI
     *
     * @param {MediaStream} mediaStream
     * @memberof App
     */
    addLocalVideo(mediaStream: MediaStream) {
        let video = document.createElement("video") as HTMLVideoElement;
        video.autoplay = true;
        video.muted = true;
        video.classList.add("l-" + mediaStream.id);
        video.srcObject = mediaStream;
        let container = document.querySelector(".local") as HTMLElement;
        container.append(video);

        // and local stream to mixer / blender;
        this.mediaStreamBlender.addTracks(mediaStream.id, mediaStream.getTracks(), true);



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

        this.factory.GetController("broker").Invoke("chatMessage",
            data
        );
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
    addRemoteVideo(id: string, mediaStream: MediaStream) {


        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }
        let videoTools = document.createElement("div");

        videoTools.classList.add("video-tools", "p2", "darken");

        let item = document.createElement("li");
        item.setAttribute("class", "p" + id);

        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "white")

        let r = document.createElement("i");
        r.classList.add("fas", "fa-circle", "fa-2x", "red")

        r.addEventListener("click", () => {
            if (!this.isRecording)             
                r.classList.add("flash","is-recordig");

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
            } else {
                document.exitFullscreen();
            }
        });


        document.querySelector("#remote-videos").append(item);


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
        d.render(document.querySelector(".dungeons"));

        document.querySelector("#dungeon-" + key + " i").addEventListener("click", () => {
            d.destroy((peers: Array<string>) => {
                peers.forEach((peerId: string) => {
                    this.factory.GetController("broker").Invoke("leaveDungeon", {
                        key: d.id,
                        peerId: peerId
                    });
                });
                this.dungeons.delete(key);
                document.querySelector("#dungeon-" + key).remove();
            });


        });

        document.querySelector("#dungeon-" + key).addEventListener("click", () => {
            document.querySelector(".video-grid").classList.add("blur");

            this.audioNode.muted = true;

            document.querySelector(".dungeons-header").classList.add("flash");


        });
        if (document.querySelector(".dungeons").classList.contains("d-none")) {
            document.querySelector(".dungeons").classList.remove("d-none");
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
                this.mediaStreamBlender.addTracks(id, [mediaStreamTrack], false);
                this.addRemoteVideo(id, mediaStream);
            }
            return p;
        }
    }

    /**
     * Creates an instance of App - Kollokvium
     * @memberof App
     */
    constructor() {

        // see settings.json
        this.appDomain = new AppDomain();

        this.mediaStreamBlender = new MediaStreamBlender();

        // hook up listeners for MediaBlender


        let watermark = document.querySelector("#watermark") as HTMLImageElement;

        this.mediaStreamBlender.onFrameRendered = (ctx: CanvasRenderingContext2D) => {
            // postprocess , add a watermark image to recorder.      
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(watermark, 10, 10, 100, 100);
            ctx.restore();
        }

        this.mediaStreamBlender.onTrack = () => {

            this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();


        }
        this.mediaStreamBlender.onRecordingStart = () => {

            this.sendMessage(this.userSettings.nickname, "I'm now recording the session.");
        }

        this.mediaStreamBlender.onRecordingEnded = (blobUrl: string) => {

            this.displayRecording(blobUrl);

        };

        this.mediaStreamBlender.onTrackEnded = () => {
            this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();
            this.mediaStreamBlender.refreshCanvas();
        }

        document.querySelector("#appDomain").textContent = this.appDomain.domain;
        document.querySelector("#appVersion").textContent = this.appDomain.version;


        this.userSettings = new UserSettings();

        //Handle modal quick start early, if its been dismissed hide straight away
        //  if (this.userSettings.showQuickStart)
        // (document.querySelector("#quick-start-container") as HTMLElement).classList.remove("hide");


        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            document.querySelector(".only-desktop").classList.add("hide");
        }

        // if (!location.href.includes("https://"))

        this.peerId = null;
        this.numOfChatMessagesUnread = 0;

        this.participants = new Map<string, AppParticipant>();
        this.dungeons = new Map<string, DungeonComponent>();

        this.Slug = location.hash.replace("#", "");

        this.fullScreenVideo = document.querySelector(".full") as HTMLVideoElement;
        this.shareContainer = document.querySelector("#share-container");
        this.shareFile = document.querySelector("#share-file") as HTMLElement;

        this.videoGrid = document.querySelector("#video-grid") as HTMLElement;


        this.audioNode = document.querySelector("#remtote-audio-node audio") as HTMLAudioElement;



        this.lockContext = document.querySelector("#context-lock") as HTMLElement;



        let slug = document.querySelector("#slug") as HTMLInputElement;
        let startButton = document.querySelector("#joinconference") as HTMLInputElement;
        let chatWindow = document.querySelector(".chat") as HTMLElement;
        let chatMessage = document.querySelector("#chat-message") as HTMLInputElement;
        let chatMessages = document.querySelector("#chatmessages") as HTMLElement;

        let muteAudio = document.querySelector("#mute-local-audio") as HTMLElement;
        let muteVideo = document.querySelector("#mute-local-video") as HTMLElement;

        let muteSpeakers = document.querySelector("#mute-speakers") as HTMLElement;

        let startScreenShare = document.querySelector("#share-screen") as HTMLElement;

        let settings = document.querySelector("#settings") as HTMLElement;
        let saveSettings = document.querySelector("#save-settings") as HTMLElement;

        let unreadBadge = document.querySelector("#unread-messages") as HTMLElement;

        let generateSlug = document.querySelector("#generate-slug") as HTMLHtmlElement

        let nickname = document.querySelector("#txt-nick") as HTMLInputElement;

        let videoDevice = document.querySelector("#sel-video") as HTMLInputElement;
        let audioDevice = document.querySelector("#sel-audio") as HTMLInputElement;
        let videoResolution = document.querySelector("#sel-video-res") as HTMLInputElement;
        // just set the value to saved key, as user needs to scan..

        let closeQuickstartButton = document.querySelector("#close-quick-start") as HTMLInputElement;
        let helpButton = document.querySelector("#help") as HTMLInputElement;

        document.querySelector("#sel-video-res option").textContent = "Using dynamic resolution";

        let toogleRecord = document.querySelector(".record") as HTMLAudioElement;

        let testResolutions = document.querySelector("#test-resolutions") as HTMLButtonElement;


        nickname.value = this.userSettings.nickname;


        this.videoGrid.addEventListener("click", () => {
            this.videoGrid.classList.remove("blur");



            this.audioNode.muted = !this.audioNode.muted;


        });


        toogleRecord.addEventListener("click", () => {
            toogleRecord.classList.toggle("flash");
            this.mediaStreamBlender.render(25);
            this.mediaStreamBlender.record();

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
                    document.querySelector("#sel-video").append(option);
                } else {
                    if (option.value == this.userSettings.audioDevice) option.selected = true;
                    document.querySelector("#sel-audio").append(option);
                }

            });

            devices.filter(((d: MediaDeviceInfo) => {
                return d.kind.indexOf("output") > 0
            })).forEach(((d: MediaDeviceInfo) => {
                let option = document.createElement("option");
                option.textContent = d.label || d.kind;
                option.setAttribute("value", d.deviceId);
                document.querySelector("#sel-audio-out").append(option);
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
                }).catch(() => {
                    console.log("error");
                });
            });



        });

        settings.addEventListener("click", () => {
            console.log("!");
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
                ReadFile.read(file).then((result) => {
                    this.sendFile({
                        name: result.tf.name,
                        size: result.tf.size,
                        mimeType: result.tf.type
                    }, result.buffer);
                    $("#share-file").popover("hide");
                });
            });
        });



        document.querySelector("#create-dungeon").addEventListener("click", () => {
            $("#modal-dungeon").modal("toggle");
            let container = document.querySelector(".dungeon-thumbs");
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

        document.querySelector("button#invite-dungeon").addEventListener("click", () => {
            document.querySelector(".dungeons").classList.remove("d-none");
            $("#modal-dungeon").modal("toggle");
            let peers = new Array<string>();
            document.querySelectorAll(".dungeon-paricipant").forEach((el: HTMLElement) => {
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
            document.querySelector("#slug-history").prepend(option);
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
            this.muteAudio(e)
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e)
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

        document.querySelector("button#share-link").addEventListener("click", (e: any) => {
            navigator.clipboard.writeText(`${location.origin}/#${slug.value}`).then(() => {
                e.target.textContent = "Done!"
            });
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
        } else {
            startButton
            startButton.textContent = "JOIN";
        }
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));

            } else {
                startButton.disabled = true;
            }
        });


        nickname.addEventListener("change", () => {
            this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
        });


      
        startButton.addEventListener("click", () => {

            this.videoGrid.classList.add("d-flex");

            this.lockContext.classList.remove("hide");



            document.querySelector(".fa-dungeon").classList.toggle("hide");
            document.querySelector(".top-bar").classList.remove("d-none");

            document.querySelector("#record").classList.remove("d-none");

            $("#random-slug").popover("hide");

            document.querySelector("#share-file").classList.toggle("hide");
            // document.querySelector("#share-screen").classList.toggle("d-none");
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
        this.factory = this.connectToServer(this.appDomain.serverUrl, {})

        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {

            this.rtcClient = new WebRTC(broker, this.rtcConfig);

            broker.On("fileShare", (fileinfo: any, arrayBuffer: ArrayBuffer) => {
                this.fileReceived(fileinfo, arrayBuffer)
            });

            broker.On("lockContext", () => {

                this.lockContext.classList.toggle("fa-lock-open");
                this.lockContext.classList.toggle("fa-lock");
            });

            // hook up dungeon functions


            broker.On("isRoomLocked", (data: any) => {


                startButton.disabled = data.state;
                if (data.state) {
                    slug.classList.add("is-invalid");
                } else {
                    slug.classList.remove("is-invalid");
                }

            });


            broker.On("leaveDungeon", (data: any) => {

                console.log("leaveDungeon", data);
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


                document.querySelector(".toasters").prepend(toast);
                $(".toast").toast("show");

            });

            broker.On("acceptDungeon", (data) => {
                let d = this.dungeons.get(data.key);
                try {
                    d.addDungeonParticipant(this.participants.get(data.peerId));
                } catch (e) {
                    console.log(e);
                }

                console.log(data, d);
            });



            // hook up chat functions...

            broker.On("chatMessage", (im: any) => {

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

            chatMessage.addEventListener("keydown", (e) => {
                if (e.keyCode == 13) {
                    this.sendMessage(this.userSettings.nickname, chatMessage.value)
                    chatMessage.value = "";
                }
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
                document.querySelector(".p" + peer.id).remove();
                this.participants.delete(peer.id);
            };
            this.rtcClient.OnContextConnected = (peer) => {
                document.querySelector(".remote").classList.add("hide");
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                let participant = this.tryAddParticipant(connection.id);

                participant.addTrack(track, (el: HTMLAudioElement) => {

                    this.mediaStreamBlender.addTracks(`audio-${connection.id}`, [track], false);


                });


                participant.onVideoTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                    let p = document.querySelector(".p" + id);
                    if (p) p.remove();

                    // todo:  Remove from blender..

                }
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
                        this.localMediaStream = mediaStream;
                        this.rtcClient.AddLocalStream(mediaStream);
                        this.addLocalVideo(mediaStream);
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
    if (!(location.href.includes("https://") || location.href.includes("http://localhost"))) location.href = location.href.replace("http://", "https://")
    App.getInstance();

});
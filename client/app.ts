import { Factory, WebRTC, BinaryMessage, Message, Utils } from 'thor-io.client-vnext'
import adapter from 'webrtc-adapter';
import ClipboardJS from 'clipboard';
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipant } from './AppParticipant';
import { PeerConnection } from 'thor-io.vnext';
import { ReadFile } from './ReadFile';
import { UserSettings } from './UserSettings';
import { AppDomain } from './AppDomain';
import {MediaStreamBlender} from 'mediastreamblender'


export class App {
    appDomain: AppDomain;
    videoGrid: HTMLElement;
    audioNode: HTMLAudioElement;

    // Create a an AppDomain of kollokvium;


    getLocalStream(constraints: MediaStreamConstraints, cb: Function) {

        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream: MediaStream) => {

            cb(mediaStream);

        }).catch(err => {
            console.error(err);
        });

    }
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
     * Adds a fileshare message to chat, when someone shared a file...
     *
     * @param {*} fileinfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    fileReceived(fileinfo: any, arrayBuffer: ArrayBuffer) {

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
    /**
     * Record a remotestream
     *
     * @param {string} peerid
     * @memberof App
     */
    recordStream(peerid:string){
        // if(!this.mediaStreamBlender) {
        //     let tracks = this.rtcClient.Peers.get(peerid).stream.getTracks()

        //     this.mediaStreamBlender = new MediaStreamRecorder(tracks);

        //     this.mediaStreamBlender.mediaStream.addTrack(
        //         this.rtcClient.LocalStreams[0].getAudioTracks()[0]
        //     );
            
        //     this.mediaStreamBlender.start(20);
        // }   else{
        //     this.mediaStreamBlender.stop();

            
        //     let result = this.mediaStreamBlender.toBlob();
        //     const download = document.createElement("a");
        //     download.setAttribute("href", result);
        //     download.textContent =  peerid;
        //     download.setAttribute("download", `${peerid}.webm`);
            
        //     document.querySelector("#recorder-download").append(download);

        //     $("#recorder-result").modal("show");

        //     this.mediaStreamBlender = null;

        // }        
    
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
         this.mediaStreamBlender.addTracks(mediaStream.id,mediaStream.getTracks(),true);     



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
        this.factory.GetController("broker").Invoke("instantMessage",
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

        videoTools.classList.add("video-tools");

        let item = document.createElement("li");
        item.setAttribute("class", "p" + id);

        let f = document.createElement("i");
        f.classList.add("fas", "fa-arrows-alt", "fa-2x", "fullscreen")

      

        videoTools.append(f);
     
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
            } else {
                document.exitFullscreen();
            }
        });

        // r.addEventListener("click",(e) => {
        //     let s = e.target as HTMLElement           
        //     s.classList.toggle("flash");
        //     this.recordStream(s.dataset.peerid);
        // });

        // beta only supports one participant..
        // if(this.participants.size > 1) r.classList.add("hide");


        document.querySelector("#remote-videos").append(item);

        console.log("adding remote video to ui");
        
    }


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
                this.mediaStreamBlender.addTracks(id,[mediaStreamTrack],false);
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

        this.mediaStreamBlender.onTrack = () => {
            console.log("track added to mediablender");
            this.audioNode.srcObject = this.mediaStreamBlender.getRemoteAudioStream();

            
        }
        this.mediaStreamBlender.onRecordingStart = () => {
            console.log("started recording session..");
            this.sendMessage(this.userSettings.nickname,"I'm now recording the session.");
        }

        this.mediaStreamBlender.onRecordingEnded = (blobUrl:string) => {

            let p = document.createElement("p");

            const download = document.createElement("a");
            download.setAttribute("href", blobUrl);
            download.textContent =  "Your recording has ended, here is the file. ( click to download )";
            download.setAttribute("download", `${Math.random().toString(36).substring(6)}.webm`);
            
            p.append(download);

            document.querySelector("#recorder-download").append(p);

            $("#recorder-result").modal("show");

        }; 


        document.querySelector("#appDomain").textContent = this.appDomain.domain;
        document.querySelector("#appVersion").textContent = this.appDomain.version;

     
        this.userSettings = new UserSettings();

        // Remove screenshare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            document.querySelector(".only-desktop").classList.add("hide");
        }



        if (!location.href.includes("https://"))

            this.peerId = null;
        this.numOfChatMessagesUnread = 0;

        this.participants = new Map<string, AppParticipant>();


        this.Slug = location.hash.replace("#", "");

        this.fullScreenVideo = document.querySelector(".full") as HTMLVideoElement;
        this.shareContainer = document.querySelector("#share-container");
        this.shareFile = document.querySelector("#share-file") as HTMLElement;

        this.videoGrid = document.querySelector("#video-grid") as HTMLElement;


        this.audioNode = document.querySelector("#remtote-audio-nodes audio")as HTMLAudioElement;

        let slug = document.querySelector("#slug") as HTMLInputElement;
        let startButton = document.querySelector("#joinconference") as HTMLInputElement;
        let chatWindow = document.querySelector(".chat") as HTMLElement;
        let chatMessage = document.querySelector("#chat-message") as HTMLInputElement;
        let chatNick = document.querySelector("#chat-nick") as HTMLInputElement;
        let chatMessages = document.querySelector("#chatmessages") as HTMLElement;

        let muteAudio = document.querySelector("#mute-local-audio") as HTMLElement;
        let muteVideo = document.querySelector("#mute-local-video") as HTMLElement;
        let startScreenShare = document.querySelector("#share-screen") as HTMLElement;

        let settings = document.querySelector("#settings") as HTMLElement;
        let saveSettings = document.querySelector("#save-settings") as HTMLElement;

        let unreadBadge = document.querySelector("#unread-messages") as HTMLElement;

        let generateSlug = document.querySelector("#generate-slug") as HTMLHtmlElement

        let nickname = document.querySelector("#txt-nick") as HTMLInputElement;
        let videoDevice = document.querySelector("#sel-video") as HTMLInputElement;
        let audioDevice = document.querySelector("#sel-audio") as HTMLInputElement;

        let toogleRecord = document.querySelector(".record") as HTMLAudioElement;



        nickname.value = this.userSettings.nickname;


        toogleRecord.addEventListener("click", () => {

            toogleRecord.classList.toggle("flash");
            this.mediaStreamBlender.render(60);
            this.mediaStreamBlender.record();

        });



        this.getMediaDevices().then((devices: Array<MediaDeviceInfo>) => {

            let inputOnly = devices.filter(((d: MediaDeviceInfo) => {
                return d.kind.indexOf("input") > 0
            }));
            inputOnly.forEach((d: MediaDeviceInfo) => {

                let option = document.createElement("option");
                option.textContent = d.label;
                option.setAttribute("value", d.deviceId);

                if (d.kind == "videoinput") {
                    document.querySelector("#sel-video").append(option);
                } else {
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

            this.rtcClient.LocalStreams.forEach((m: MediaStream) => {

                document.querySelector(".l-" + m.id).remove();
            });
            this.rtcClient.LocalStreams = new Array<MediaStream>();

            this.getLocalStream(this.userSettings.createConstraints(), (mediaStream: MediaStream) => {
                this.localMediaStream = mediaStream;
                this.rtcClient.AddLocalStream(mediaStream);
                this.addLocalVideo(mediaStream);
            });


        });

        settings.addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
        })

        // jQuery hack for file share
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


        let clipBoard = new ClipboardJS("#share-link", {
            text: (t) => {
                t.textContent = "Done!"
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
        } else {
            startButton.textContent = "JOIN";
        }

        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            } else {
                startButton.disabled = true;
            }
        });


        chatNick.value = this.userSettings.nickname;

        chatNick.addEventListener("click", () => {
            chatNick.value = "";
        });

        startButton.addEventListener("click", () => {

            this.videoGrid.classList.add("d-flex");

            document.querySelector("#record").classList.remove("d-none");

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
        this.factory = this.connectToServer(this.appDomain.serverUrl, {})

        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {

            this.rtcClient = new WebRTC(broker, this.rtcConfig);

            broker.On("fileShare", (fileinfo: any, arrayBuffer: ArrayBuffer) => {
                this.fileReceived(fileinfo, arrayBuffer)
            });

            // hook up chat functions...

            broker.On("instantMessage", (im: any) => {

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
                    this.sendMessage(chatNick.value, chatMessage.value)
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
            };
            this.rtcClient.OnContextConnected = (peer) => {
                document.querySelector(".remote").classList.remove("hide");
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                let participant = this.tryAddParticipant(connection.id);

                participant.addTrack(track, (el: HTMLAudioElement) => {

                    this.mediaStreamBlender.addTracks(`audio-${connection.id}`,[track],false);
                  

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

                this.getLocalStream(
                    this.userSettings.createConstraints(),
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
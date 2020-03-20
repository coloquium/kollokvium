import { Factory, WebRTC, BinaryMessage, Message, Utils } from 'thor-io.client-vnext'
import adapter from 'webrtc-adapter';
import ClipboardJS from 'clipboard';
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipant } from './AppParticipant';
import { PeerConnection } from 'thor-io.vnext';
import { ReadFile } from './ReadFile';
import { AppSettings } from './AppSettings';
import { AppDomain } from './AppDomain';


export class App {
    appDomain: AppDomain;

    // Create a an AppDomain of kollokvium;

  

    getLocalStream(constraints:MediaStreamConstraints,cb:Function) {

        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream: MediaStream) => {
            $(".local").popover("show");
            setTimeout(() => {
                $(".local").popover("hide");
            }, 5000);
            
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

    appSettings: AppSettings;


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

        let video = document.createElement("video");
        video.classList.add("rounded", "mx-auto", "d-block");

        video.srcObject = mediaStream;
        video.setAttribute("class", "p" + id);
        video.autoplay = true;
        document.querySelector("#remote-videos").append(video);

        video.addEventListener("click", (e: any) => {
            this.fullScreenVideo.play();
            this.fullScreenVideo.srcObject = e.target.srcObject;
        });
    }


    getMediaDevices():Promise<Array<MediaDeviceInfo>> {
        return new Promise<Array<MediaDeviceInfo>>( (resolve:any,reject:any ) => {
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

        // Name your app and it's secrect ( prefix )
        this.appDomain = new AppDomain("Kollokvium","kollokvium");

        document.querySelector("#appDomain").textContent = this.appDomain.domain;
        document.querySelector("#appVersion").textContent = this.appDomain.version;

        this.appSettings = new AppSettings();

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

        nickname.value = this.appSettings.nickname;
          
    

    
        this.getMediaDevices().then( (devices:Array<MediaDeviceInfo>) => {

                let inputOnly = devices.filter( ((d:MediaDeviceInfo) => {
                     return d.kind.indexOf("input") > 0
                }));                
                inputOnly.forEach ( (d:MediaDeviceInfo) => {

                    let option = document.createElement("option");
                    option.textContent = d.label;
                    option.setAttribute("value",d.deviceId);

                    if(d.kind == "videoinput"){
                        document.querySelector("#sel-video").append(option);
                    }else {
                        document.querySelector("#sel-audio").append(option);
                    }

                });
            
                videoDevice.value = this.appSettings.videoDevice;
                audioDevice.value = this.appSettings.audioDevice;
                // get the media devices 

        }).catch(console.error);

        saveSettings.addEventListener("click", () => {
           
            this.appSettings.nickname = nickname.value;
            this.appSettings.audioDevice = audioDevice.value;
            this.appSettings.videoDevice = videoDevice.value;

            this.appSettings.saveSetting();

            this.rtcClient.LocalStreams.forEach( (m:MediaStream) => {
                
                document.querySelector(".l-" + m.id).remove();
            });
            this.rtcClient.LocalStreams = new Array<MediaStream>();

            this.getLocalStream(this.appSettings.createConstraints(),(mediaStream:MediaStream) => {
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

       

        this.appSettings.slugHistory.getHistory().forEach((slug: string) => {
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

        this.shareFile.addEventListener("click",() => {
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


        if (location.hash.length == 0){
            $("#random-slug").popover("show");
        }else{
            startButton.textContent = "JOIN";
        }
        
        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            } else {
                startButton.disabled = true;
            }
        });

       
        chatNick.value = this.appSettings.nickname;

        chatNick.addEventListener("click", () => {
            chatNick.value = "";
        });

        startButton.addEventListener("click", () => {

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

            this.appSettings.slugHistory.addToHistory(slug.value);

            this.rtcClient.ChangeContext(this.appDomain.getSlug(slug.value));
        });

        // if local ws://localhost:1337/     
        //  wss://simpleconf.herokuapp.com/
        this.factory = this.connectToServer("wss://kollokvium.herokuapp.com/", {})

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
                // addRemoteVideo(peer.stream, peer.id);
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track, (el: HTMLAudioElement) => {
                    document.querySelector("#remtote-audio-nodes").append(el);
                });
           
                participant.onVideoTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                    let p = document.querySelector(".p" + id);
                    if(p) p.remove();
                }
            }
            this.rtcClient.OnContextCreated = function (ctx: PeerConnection) {
                    // noop
            }
            broker.OnOpen = (ci: any) => {
        
                this.getLocalStream(
                    this.appSettings.createConstraints(),
                                (mediaStream:MediaStream) => {
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
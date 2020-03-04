import { Factory, WebRTC } from 'thor-io.client-vnext'
import adapter from 'webrtc-adapter';
import ClipboardJS from 'clipboard';
import { Controller } from 'thor-io.client-vnext/src/Controller';



export class App {
    factory: Factory;
    rtcClient: WebRTC;

    rtcConfig = {
        "iceTransports": 'all',
        "rtcpMuxPolicy": "require",
        "bundlePolicy": "max-bundle",
        "iceServers": [
                       {
                "urls": "stun:stun.l.google.com:19302"
            }
        ]
    };

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

    connect(url: string, config: any): Factory {
        return new Factory(url, ["broker"]);
    }

    constructor() {

        const joinSlug = location.hash.replace("#", "");

        let fullScreenVideo = document.querySelector(".full") as HTMLVideoElement;
        let slug = document.querySelector("#slug") as HTMLInputElement;
        let startButton = document.querySelector("#joinconference") as HTMLInputElement;
        let shareContainer = document.querySelector("#share-container");

        let chatWindow = document.querySelector(".chat") as HTMLElement;

        let chatMessage = document.querySelector("#chat-message") as HTMLInputElement;
        let chatNick = document.querySelector("#chat-nick") as HTMLInputElement;
        let chatMessages = document.querySelector("#chatmessages") as HTMLElement;


        let clipBoard = new ClipboardJS("#share-link", {
            text: (t) => {
                t.textContent = "Done!"
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

        const addRemoteVideo = (mediaStream: MediaStream, peerId: string) => {
            if (!shareContainer.classList.contains("hide")) {
                shareContainer.classList.add("hide");
            }
            let video = document.createElement("video");
            video.classList.add("rounded","mx-auto","d-block");

            video.srcObject = mediaStream;
            video.setAttribute("id", "p" + peerId);
            video.autoplay = true;
            document.querySelector("#remote-videos").append(video);

            video.addEventListener("click", (e: any) => {
                fullScreenVideo.play();
                fullScreenVideo.srcObject = e.target.srcObject;
            });
        }


        
        const addLocalVideo = (mediaStream: MediaStream) => {
            let video = document.querySelector(".local video") as HTMLVideoElement;
            video.srcObject = mediaStream;
        }


        slug.addEventListener("click",() => {
            $("#slug").popover('show');
        })


        slug.addEventListener("keyup", () => {
            if (slug.value.length >= 6) {
                startButton.disabled = false;
            } else {
                startButton.disabled = true;
            }
        });


        // set a random nick..

        chatNick.value = Math.random().toString(36).substring(8);

        chatNick.addEventListener("click", () => {
            chatNick.value = "";
        })




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
        this.factory = this.connect("ws://localhost:1337/", {})

        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {

          //  let broker = this.factory.GetProxy("broker");


            console.log("OnOpen", broker)


            // hook up chat functions...

            broker.On("instantMessage", (im: any) => {

                let message = document.createElement("p");



                message.textContent = im.text;

                let sender = document.createElement("mark");
                sender.textContent = im.from;

                message.prepend(sender);

                chatMessages.prepend(message);
            });

            chatMessage.addEventListener("keyup", (e) => {

                if (e.keyCode == 13) {

                    this.sendMessage(chatNick.value, chatMessage.value)
                    chatMessage.value = "";
                }
            });


            this.rtcClient = new WebRTC(broker, this.rtcConfig);

            this.rtcClient.OnLocalStream = (mediaStream: MediaStream) => {
            }
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {
            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();
                console.log("looks like we are abut to join a context...", ctx);
            }
            this.rtcClient.OnContextDisconnected = (peer) => {
                console.log("lost connection to", peer)
                document.querySelector("#p" + peer.id).remove();
            };
            this.rtcClient.OnContextConnected = (peer) => {
                console.log("connected to", peer);
                document.querySelector(".remote").classList.remove("hide");
                addRemoteVideo(peer.stream, peer.id);
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                console.log("looks like we got a remote media steamTrack", track);
            }
            this.rtcClient.OnContextCreated = function (ctx) {
                console.log("got a context from the broker", ctx);
            }
            broker.OnOpen = (ci: any) => {
                console.log("connected to broker, no get a local media stream");
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { min: 640, ideal: 1280 },
                        height: { min: 400, ideal: 720 }
                    }, audio: true,
                }).then((mediaStream: MediaStream) => {
                    this.rtcClient.AddLocalStream(mediaStream);
                    addLocalVideo(mediaStream);
                }).catch(err => {
                    console.error(err);
                });
            }
            broker.Connect();
        };
    }

    static getInstance() {
        return new App()
    }

}


document.addEventListener("DOMContentLoaded", () => {

    App.getInstance();



});
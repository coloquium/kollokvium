import { Factory, WebRTC } from 'thor-io.client-vnext'
import adapter from 'webrtc-adapter';
import ClipboardJS from 'clipboard';
import { Controller } from 'thor-io.client-vnext/src/Controller';


export class AppParticipant {

        audioTracks: Array<MediaStreamTrack>;
        videoTracks: Array<MediaStreamTrack>;

        onVideoAdded:(id:string,s:MediaStream) => void;
        
        constructor(public id:string){
            this.videoTracks = new Array<MediaStreamTrack>();
            this.audioTracks = new Array<MediaStreamTrack>();
        }
        addVideoTrack(t:MediaStreamTrack){
                this.videoTracks.push(t)
                let stream = new MediaStream([t]);
                t.onended =() => {
                    // todo: would be an delagated event
                    document.querySelector(".p" + this.id).remove();
                }
                this.onVideoAdded(this.id,stream);
        }
        addAudioTrack(t:MediaStreamTrack){
            this.audioTracks.push(t)

            let audio = new Audio();
            audio.autoplay = true;
            audio.srcObject = new MediaStream([t]);        

    }
    addTrack(t:MediaStreamTrack){
        t.kind == "video" ? this.addVideoTrack(t) : this.addAudioTrack(t);
    }
}

export class App {
    factory: Factory;
    rtcClient: WebRTC;

    localMediaStream:MediaStream;
    Slug: string;

    participants:Map<string,AppParticipant>;
    shareContainer: any;
    fullScreenVideo: HTMLVideoElement;

    shareScreen(){

        const gdmOptions = {
            video: {
              cursor: "always"
            },
            audio:false
          };

        //   audio: {
        //     echoCancellation: true,
        //     noiseSuppression: true,
        //     sampleRate: 44100
        //   }
        
         navigator.mediaDevices["getDisplayMedia"](gdmOptions).then( (stream:MediaStream) => {
           
            
            //this.rtcClient.AddLocalStream(stream);

            stream.getVideoTracks().forEach ( (t:MediaStreamTrack) => {
                this.rtcClient.LocalStreams[0].addTrack(t);
            });

       
            this.addLocalVideo(stream);

            document.querySelector("#share-screen").classList.add("hide")
           


         }).catch(err => console.error)
         
    
    }

    muteVideo(evt:any):void{
        let el = evt.target as HTMLElement;
        el.classList.toggle("fa-video");
        el.classList.toggle("fa-video-slash")
        let mediaTrack = this.localMediaStream.getVideoTracks();   

        mediaTrack.forEach( (track:MediaStreamTrack) => {              
                track.enabled = !track.enabled;              
            
        });
        
    }
    muteAudio(evt:any):void{     
        let el = evt.target as HTMLElement;
        el.classList.toggle("fa-microphone");
        el.classList.toggle("fa-microphone-slash")
        let mediaTrack = this.localMediaStream.getAudioTracks();        
        mediaTrack.forEach( (track:MediaStreamTrack) => {              
                track.enabled = !track.enabled;              
            
        });
        
    }

    addLocalVideo(mediaStream: MediaStream)  {
        let video = document.createElement("video") as HTMLVideoElement;
        video.autoplay = true;
        video.srcObject = mediaStream;     
        let container = document.querySelector(".local") as HTMLElement;
        container.append(video);     
       
    }
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



    addRemoteVideo (id:string,mediaStream: MediaStream)  {

          

        if (!this.shareContainer.classList.contains("hide")) {
            this.shareContainer.classList.add("hide");
        }

        let video = document.createElement("video");
        video.classList.add("rounded","mx-auto","d-block");

        video.srcObject = mediaStream ;
        video.setAttribute("class", "p" + id);
        video.autoplay = true;
        document.querySelector("#remote-videos").append(video);

        video.addEventListener("click", (e: any) => {
            this.fullScreenVideo.play();
            this.fullScreenVideo.srcObject = e.target.srcObject;
        });

     
       
    }
    tryAddParticipant(id:string):AppParticipant{
        if(this.participants.has(id)){
            return this.participants.get(id);
        }else{
            this.participants.set(id,new AppParticipant(id));
            let p =  this.participants.get(id);
            p.onVideoAdded = (id:string,mediaStream:MediaStream) =>
            {
                console.log(id,mediaStream);
                this.addRemoteVideo(id,mediaStream);
            }
          
        

            return p;
        }
    }

    constructor() {

        this.participants = new Map<string,AppParticipant>();

        this.Slug = location.hash.replace("#", "");

        this.fullScreenVideo = document.querySelector(".full") as HTMLVideoElement;
        let slug = document.querySelector("#slug") as HTMLInputElement;
        let startButton = document.querySelector("#joinconference") as HTMLInputElement;
        this.shareContainer = document.querySelector("#share-container");

        let chatWindow = document.querySelector(".chat") as HTMLElement;

        let chatMessage = document.querySelector("#chat-message") as HTMLInputElement;
        let chatNick = document.querySelector("#chat-nick") as HTMLInputElement;
        let chatMessages = document.querySelector("#chatmessages") as HTMLElement;


        let muteAudio = document.querySelector("#mute-local-audio") as HTMLElement;
        let muteVideo = document.querySelector("#mute-local-video") as HTMLElement;
        let screen = document.querySelector("#share-screen") as HTMLElement;
    
        muteAudio.addEventListener("click",(e) => {
             this.muteAudio(e)
        });
        muteVideo.addEventListener("click",(e) => {
            this.muteVideo(e)
        });
        
        screen.addEventListener("click",() => {
            this.shareScreen();
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
        }

        document.querySelector("#close-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });
        document.querySelector("#show-chat").addEventListener("click", () => {
            chatWindow.classList.toggle("d-none");
        });



        
      


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
        this.factory = this.connect("wss://kollokvium.herokuapp.com/", {})

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
                document.querySelector(".p" + peer.id).remove();
            };
            this.rtcClient.OnContextConnected = (peer) => {
         
                document.querySelector(".remote").classList.remove("hide");
               // addRemoteVideo(peer.stream, peer.id);
            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
             
                let participant = this.tryAddParticipant(connection.id);

                participant.addTrack(track)

    
                
                console.log(participant);
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
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(mediaStream);
                    this.addLocalVideo(mediaStream);
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
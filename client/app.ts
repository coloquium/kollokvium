import { Factory, WebRTC, BinaryMessage, Message } from 'thor-io.client-vnext'
import adapter from 'webrtc-adapter';
import ClipboardJS from 'clipboard';
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipant } from './AppParticipant';
import { SlugHistory } from './SlugHistory';

export class ReadFile {


        static read(f:any):Promise<any>{
         
             return new Promise<any>( (resolve,reject) => {
                let reader = new FileReader();
                    reader.onerror = reject
                    reader.onload = (function (tf) {
                        return function (e:any) {
                            resolve({buffer:e.target.result,tf:tf});
                        };
                    })(f);
                    reader.readAsArrayBuffer(f);
             });                   
        }
}


export class App {
    shareFile: HTMLElement;
    fileReceived(fileinfo: any, arrayBuffer: ArrayBuffer) {    

        const dt = new Date();
        const p = document.createElement("p");
        p.textContent = "Here is shared a file... ";
       
       
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
    sendFile(fileInfo:any,buffer:ArrayBuffer){
      
        var message = new Message("fileShare",
                  fileInfo,"broker",buffer);
                    let bm = new BinaryMessage(message.toString(),buffer);           
                  this.factory.GetController("broker").InvokeBinary(bm.Buffer);
    }

    readFile(evt) {
        const file = evt.target.files[0];
        ReadFile.read(file).then( (result:any) => {
            console.log("file read result",result);
        });
    }


    factory: Factory;
    rtcClient: WebRTC;

    localMediaStream:MediaStream;
    Slug: string;

    participants:Map<string,AppParticipant>;
    shareContainer: any;
    fullScreenVideo: HTMLVideoElement;
    peerId: any;
    numOfChatMessagesUnread: number;
    

    shareScreen(){
        const gdmOptions = {
            video: {
              cursor: "always"
            },
            audio:false
          };       
         navigator.mediaDevices["getDisplayMedia"](gdmOptions).then( (stream:MediaStream) => {
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
        video.muted = true;
    
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

    connectToServer(url: string, config: any): Factory {
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
                this.addRemoteVideo(id,mediaStream);
            }        
            return p;
        }
    }

    /**
     * Creates an instance of App.
     * @memberof App
     */
    constructor() {


       

        if(!location.href.includes("https://"))

        this.peerId = null;
        this.numOfChatMessagesUnread = 0;
        
        this.participants = new Map<string,AppParticipant>();
        
        let slugHistory = new SlugHistory();


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



        // jQuery hack for file share
        $("#share-file").popover({
            trigger:"manual",
            sanitize:false,
            placement: "top",
            title: 'Select the file to share.',
            html:true,
            content:  $('#share-form').html()
        }).on("inserted.bs.popover",(e) => {          
                $(".file-selected").on("change",(evt:any) => {
                    const file = evt.target.files[0];
                    ReadFile.read(file).then( (result) => {
                        console.log("file read",result);
                        this.sendFile({
                            name: result.tf.name,
                            size: result.tf.size,
                            mimeType: result.tf.type
                        },result.buffer);
                        $("#share-file").popover("hide");
                    });
                });
        });

        
            document.querySelector("#share-file").addEventListener("click", () => {
                $("#share-file").popover("show");
            });
       

    

        let unreadBadge = document.querySelector("#unread-messages") as HTMLElement;





        slugHistory.getHistory().forEach( (slug:string) => {
            const option = document.createElement("option");
            option.setAttribute("value",slug);
            document.querySelector("#slug-history").prepend(option);    
        });

    
        muteAudio.addEventListener("click",(e) => {
             this.muteAudio(e)
        });
        muteVideo.addEventListener("click",(e) => {
            this.muteVideo(e)
        });
        
        startScreenShare.addEventListener("click",() => {
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

            document.querySelector("#share-file").classList.toggle("d-none");
            document.querySelector("#share-screen").classList.toggle("d-none");
            document.querySelector("#show-chat").classList.toggle("d-none");
            document.querySelector(".our-brand").remove();
            $("#slug").popover('hide');
            startButton.classList.add("hide");
            document.querySelector(".remote").classList.remove("hide");

            document.querySelector(".overlay").classList.add("d-none");
            document.querySelector(".join").classList.add("d-none");

            slugHistory.addToHistory(slug.value);
            
            this.rtcClient.ChangeContext(slug.value);
        });

        // if local ws://localhost:1337/     
        //  wss://simpleconf.herokuapp.com/
        this.factory = this.connectToServer("wss://kollokvium.herokuapp.com/", {})

        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {
          //  let broker = this.factory.GetProxy("broker");
            console.log("OnOpen", broker)


            broker.On("fileShare",(fileinfo,arrayBuffer)=> { 
                this.fileReceived(fileinfo,arrayBuffer)
            });


            // hook up chat functions...

            broker.On("instantMessage", (im: any) => {

                this.numOfChatMessagesUnread ++;
                let message = document.createElement("p");

                message.textContent = im.text;

                let sender = document.createElement("mark");
                sender.textContent = im.from;

                message.prepend(sender);

                chatMessages.prepend(message);

                if(chatWindow.classList.contains("d-none")){

                
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


      

            this.rtcClient = new WebRTC(broker, this.rtcConfig);

            this.rtcClient.OnLocalStream = (mediaStream: MediaStream) => {
            }
            this.rtcClient.OnContextConnected = (ctx) => {
            };
            this.rtcClient.OnContextCreated = (ctx) => {
                console.log(ctx);

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



    if(!(location.href.includes("https://") || location.href.includes("http://localhost"))) location.href = location.href.replace("http://","https://")
    
    App.getInstance();



});
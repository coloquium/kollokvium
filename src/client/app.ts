import adapter from 'webrtc-adapter';
import { Factory, WebRTC, BinaryMessage, Message, DataChannel, PeerChannel, Utils } from 'thor-io.client-vnext'
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipantComponent } from './Components/AppParticipantComponent';
import { ReadFile } from './Helpers/ReadFile';
import { UserSettings } from './UserSettings';
import { AppDomain } from './AppDomain';
import { MediaStreamBlender, MediaStreamRecorder, StreamSource } from 'mediastreamblender'
import { DetectResolutions } from './Helpers/DetectResolutions';
import { DOMUtils } from './Helpers/DOMUtils';
import { WebRTCConnection } from 'thor-io.client-vnext/src/WebRTC/WebRTCConnection';
import { GreenScreenComponent } from './Components/GreenScreenComponent';
import { AudioNodes } from './Audio/AudioNodes';
import { Transcriber } from './Audio/Transcriber';
import { JournalComponent } from './Components/JournalComponent';
import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import hotkeys, { HotkeysEvent } from 'hotkeys-js';
import { MediaUtils } from './Helpers/MediaUtils';
import { SpeechDetector } from './Audio/SpeechDetector';


export class App {

    appDomain: AppDomain;
    userSettings: UserSettings;
    greenScreen: GreenScreenComponent;
    mediaStreamBlender: MediaStreamBlender;
    audioNodes: AudioNodes;
    fileChannel: DataChannel;
    arbitraryChannel: DataChannel;

    singleStreamRecorder: MediaStreamRecorder
    factory: Factory;
    rtcClient: WebRTC;
    localMediaStream: MediaStream;
    slug: string;
    participants: Map<string, AppParticipantComponent>;
    isRecording: boolean;
    transcriber: Transcriber;
    preferredLanguage: string;

    numOfChatMessagesUnread: number;
    numOfPeers: number = 0;


    shareContainer: HTMLElement;
    videoGrid: HTMLElement;
    fullScreenVideo: HTMLVideoElement;

    chatWindow: HTMLElement;
    unreadBadge: HTMLElement;
    leaveContext: HTMLElement;
    startButton: HTMLInputElement;
    shareSlug: HTMLElement;
    lockContext: HTMLElement;
    generateSubtitles: HTMLElement;

    languagePicker: HTMLInputElement;
    pictureInPicture: HTMLElement;
    pictureInPictureElement: HTMLVideoElement;
    textToSpeech: HTMLInputElement;
    textToSpeechMessage: HTMLInputElement;

    journal: JournalComponent;
    speechDetector: SpeechDetector;


    /**
     *
     *
     * @memberof App
     */

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
            // unable to get camera, show camera dialog ?
            DOMUtils.get("#await-need-error").classList.toggle("hide");
            DOMUtils.get("#await-need-accept").classList.toggle("hide");
        });
    }
    /**
     * Adds a fileShare message to chat window
     *
     * @param {*} fileInfo
     * @param {ArrayBuffer} arrayBuffer
     * @memberof App
     */
    displayReceivedFile(fileInfo: any, blob: Blob) {
        this.numOfChatMessagesUnread++;
        if (this.chatWindow.classList.contains("d-none")) {
            this.unreadBadge.classList.remove("d-none");
            this.unreadBadge.textContent = this.numOfChatMessagesUnread.toString();
        }

        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils.makeLink("Hey,the file is ready to download, click to download ");
        sender.textContent = fileInfo.sender;
        message.prepend(time);
        message.prepend(sender);
        message.append(messageText);

        const blobUrl = window.URL.createObjectURL(blob);

        const download = document.createElement("a");
        download.setAttribute("href", blobUrl);
        download.textContent = fileInfo.name;
        download.setAttribute("download", fileInfo.name);

        messageText.append(download);

        DOMUtils.get("#chat-messages").prepend(message);
    }

    /**
     * Add a chat message to the chat window
     *
     * @param {*} msg
     * @memberof App
     */
    displayChatMessage(msg: any) {
        let chatMessages = DOMUtils.get("#chat-messages") as HTMLElement;
        this.numOfChatMessagesUnread++;
        let message = document.createElement("div");
        let sender = document.createElement("mark");
        let time = document.createElement("time");
        time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
        let messageText = document.createElement("span");
        messageText.innerHTML = DOMUtils.makeLink(msg.text);


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
        DOMUtils.get("#share-file-box").classList.toggle("hide");
        let sendProgress = DOMUtils.get<HTMLProgressElement>("#file-progress");

        sendProgress.setAttribute("aria-valuenow", "0")
        sendProgress.classList.toggle("hide");

        let meta = {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            sender: this.userSettings.nickname
        };
        const shareId = Utils.newGuid();
        let bytes = 0;
        ReadFile.readChunks(file, (data, chunkSize, isFinal) => {
            bytes += chunkSize;
            DOMUtils.get(".progress-bar", sendProgress).style.width = `${((chunkSize / meta.size) * 100) * 1000}%`;

            this.fileChannel.InvokeBinary("fileShare", meta, data, isFinal, shareId);
            if (isFinal) {
                setTimeout(() => {
                    DOMUtils.get("#share-file-box").classList.toggle("hide");
                    sendProgress.classList.toggle("hide");

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
     * Record all streams, including local
     *
     * @memberof App
     */
    recordAllStreams() {
        if (!this.mediaStreamBlender.isRecording) {

            this.mediaStreamBlender.audioSources.clear();
            this.mediaStreamBlender.videosSources.clear();

            Array.from(this.participants.values()).forEach((p: AppParticipantComponent) => {
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
     * Display the number of participants & room name in page title
     *
     * @memberof App
     */
    updatePageTitle() {
        document.title = `(${this.numOfPeers + 1}) Kollokvium  - ${this.slug} | A free multi-party video conference for you and your friends!`;
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
        video.poster = "/img/novideo.png";;
        video.srcObject = isCam ? mediaStream : mediaStream.clone();
        if (isCam) video.classList.add("local-cam");
        video.setAttribute("playsinline", '');
        let track = mediaStream.getVideoTracks()[0];
        video.classList.add("l-" + track.id)
        track.onended = () => {
            this.rtcClient.removeTrackFromPeers(track);
            this.localMediaStream.removeTrack(track);            
            DOMUtils.get(".l-" + track.id).remove();
        };
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
   *  Add a participant to the "conference"
   *
   * @param {string} id
   * @returns {AppParticipantComponent}
   * @memberof App
   */
    tryAddParticipant(id: string): AppParticipantComponent {
        if (this.participants.has(id)) {
            return this.participants.get(id);
        } else {
            let participant = new AppParticipantComponent(id);

            participant.onVideoTrackAdded = (id: string, mediaStream: MediaStream, mediaStreamTrack: MediaStreamTrack) => {
                let node = participant.render();
                participant.addVideo(id, mediaStream, node);
                DOMUtils.get("#remote-videos").append(node);
                this.numOfPeers++;
                this.updatePageTitle();

            }
            participant.onAudioTrackAdded = (id: string, mediaStream: MediaStream, mediaStreamTrack: MediaStreamTrack) => {
                this.audioNodes.add(id, mediaStream);
            };
            participant.onVideoTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                let p = DOMUtils.getAll(`li video.s${stream.id}`);
                p.forEach(n => n.parentElement.remove());
                this.numOfPeers--
                this.updatePageTitle();
            }
            participant.onAudioTrackLost = (id: string, stream: MediaStream, track: MediaStreamTrack) => {
                this.audioNodes.remove(id);
            }
            this.participants.set(id, participant);

            return participant;


        }
    }


    addSubtitles(parent: HTMLElement, text: string, lang: string, title?: string) {
        if (parent) {
            let p = document.createElement("p");
            if (title)
                p.title = title;
            p.onanimationend = () => {
                p.remove();
            };
            p.textContent = text;
            parent.append(p);
        }
    }

    disableConferenceElements() {
        location.hash = "";

        DOMUtils.get("#mute-speakers").classList.toggle("hide");
        this.generateSubtitles.classList.toggle("hide");

        let slug = DOMUtils.get("#slug") as HTMLInputElement;

        if ('pictureInPictureEnabled' in document)
            this.pictureInPicture.classList.toggle("hide");

        slug.value = "";

        DOMUtils.get("#random-slug").classList.remove("d-none");

        this.videoGrid.classList.remove("d-flex");
        this.lockContext.classList.add("hide");
        this.leaveContext.classList.add("hide");

        this.startButton.disabled = true;
        this.startButton.classList.remove("hide");
        this.shareSlug.classList.add("hide");

        this.textToSpeechMessage.disabled = true;

        DOMUtils.get("#show-journal").classList.toggle("hide");
        DOMUtils.get(".top-bar").classList.add("d-none");

        DOMUtils.get("#record").classList.add("d-none");



        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils.get("#show-chat").classList.toggle("d-none");

        DOMUtils.get(".remote").classList.add("hide");

        DOMUtils.get(".overlay").classList.remove("d-none");
        DOMUtils.get(".join").classList.remove("d-none");
        DOMUtils.get(".our-brand").classList.toggle("hide");

    }


    enableConferenceElements() {

        DOMUtils.get("#mute-speakers").classList.toggle("hide");

        if ('pictureInPictureEnabled' in document)
            this.pictureInPicture.classList.toggle("hide");

        this.startButton.classList.add("hide");
        this.generateSubtitles.classList.toggle("hide");




        this.shareSlug.classList.remove("hide");


        this.textToSpeechMessage.disabled = false;

        this.startButton.classList.remove("hide");
        this.videoGrid.classList.add("d-flex");

        this.lockContext.classList.remove("hide");

        this.leaveContext.classList.remove("hide");

        DOMUtils.get("#show-journal").classList.toggle("hide");
        DOMUtils.get(".top-bar").classList.remove("d-none");

        DOMUtils.get("#record").classList.remove("d-none");

        // Utils.$("#share-screen").classList.toggle("d-none");
        DOMUtils.get("#show-chat").classList.toggle("d-none");
        DOMUtils.get(".our-brand").classList.toggle("hide");

        $("#slug").popover('hide');

        DOMUtils.get(".remote").classList.remove("hide");

        DOMUtils.get(".overlay").classList.add("d-none");
        DOMUtils.get(".join").classList.add("d-none");
    }


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
     * Creates an instance of App - Kollokvium
     * @memberof App
     */
    constructor() {

        let slug = DOMUtils.get<HTMLInputElement>("#slug");
        let chatMessage = DOMUtils.get<HTMLInputElement>("#chat-message");
        let muteAudio = DOMUtils.get("#mute-local-audio");
        let muteVideo = DOMUtils.get("#mute-local-video");
        let muteSpeakers = DOMUtils.get("#mute-speakers");
        let startScreenShare = DOMUtils.get("#share-screen");
        let settings = DOMUtils.get("#settings");
        let saveSettings = DOMUtils.get("#save-settings");
        let generateSlug = DOMUtils.get("#generate-slug")
        let nickname = DOMUtils.get<HTMLInputElement>("#txt-nick");
        let videoDevice = DOMUtils.get<HTMLInputElement>("#sel-video")
        let audioDeviceIn = DOMUtils.get<HTMLInputElement>("#sel-audio-in");
        let audioDeviceOut = DOMUtils.get<HTMLInputElement>("#sel-audio-out");
        let videoResolution = DOMUtils.get<HTMLInputElement>("#sel-video-res");


        this.appDomain = new AppDomain();
        this.factory = this.connectToServer(this.appDomain.serverUrl, {})
        this.userSettings = new UserSettings();
        this.audioNodes = new AudioNodes();
        this.mediaStreamBlender = new MediaStreamBlender();


        UserSettings.cameraResolutions(this.userSettings.videoResolution);

        // add language options to UserSettings 
        DOMUtils.get("#languages").append(Transcriber.getlanguagePicker());
        DOMUtils.get("#appDomain").textContent = this.appDomain.domain;
        DOMUtils.get("#appVersion").textContent = this.appDomain.version;

        // Remove screenShare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            DOMUtils.get(".only-desktop").classList.add("hide");
        }

        let blenderWaterMark = DOMUtils.get<HTMLImageElement>("#watermark");
        this.mediaStreamBlender.onFrameRendered = (ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(blenderWaterMark, 10, 10, 100, 100);
            ctx.restore();
        }
        this.mediaStreamBlender.onTrack = () => {
        }
        this.mediaStreamBlender.onRecordingStart = () => {
            this.sendMessage(this.userSettings.nickname, "I'm now recording the session.");
        }
        this.mediaStreamBlender.onRecordingEnded = (blobUrl: string) => {
            this.displayRecording(blobUrl);
        };
        this.mediaStreamBlender.onTrackEnded = () => {
            try {
                this.mediaStreamBlender.refreshCanvas();
            } catch (err) {
                console.log(err);
            }
        }
        this.greenScreen = new GreenScreenComponent("gss");
        this.greenScreen.onApply = (mediaStream) => {
            DOMUtils.get("video#preview").remove()
            let a = this.localMediaStream.getVideoTracks()[0];
            this.localMediaStream.removeTrack(a);
            this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
            DOMUtils.get("#apply-virtual-bg").classList.toggle("hide");
            DOMUtils.get("#remove-virtual-bg").classList.toggle("hide");

        };

        DOMUtils.get("#components").append(this.greenScreen.render());


        this.numOfChatMessagesUnread = 0;
        this.participants = new Map<string, AppParticipantComponent>();

        this.slug = location.hash.replace("#", "");

        this.generateSubtitles = DOMUtils.get("#subtitles");

        this.fullScreenVideo = DOMUtils.get<HTMLVideoElement>(".full");
        this.shareContainer = DOMUtils.get("#share-container");

        this.videoGrid = DOMUtils.get("#video-grid");
        this.chatWindow = DOMUtils.get(".chat");

        this.lockContext = DOMUtils.get("#context-lock");
        this.unreadBadge = DOMUtils.get("#unread-messages");
        this.leaveContext = DOMUtils.get("#leave-context");
        this.startButton = DOMUtils.get<HTMLInputElement>("#join-conference");
        this.shareSlug = DOMUtils.get("#share-slug");
        this.languagePicker = DOMUtils.get<HTMLInputElement>(".selected-language");
        this.pictureInPicture = DOMUtils.get("#pip");

        this.textToSpeech = DOMUtils.get<HTMLInputElement>("#show-text-to-speech");
        this.textToSpeechMessage = DOMUtils.get<HTMLInputElement>("#text-message");

        DOMUtils.get("button#apply-fail-save-constraints").addEventListener("click", () => {
            this.getLocalStream(
                UserSettings.failSafeConstraints(),
                (mediaStream: MediaStream) => {
                    DOMUtils.get("#await-streams").classList.toggle("hide");
                    DOMUtils.get("#has-streams").classList.toggle("hide");
                    this.localMediaStream = mediaStream;
                    this.rtcClient.AddLocalStream(this.localMediaStream);
                    this.addLocalVideo(this.localMediaStream, true);
                    if (location.hash.length <= 6)
                        $("#random-slug").popover("show");
                });
        });

        DOMUtils.get("#show-journal").addEventListener("click", () => {
            DOMUtils.get("#generate-journal").textContent = "Copy to clipboard";
            if (this.journal.data.length > 0)
                DOMUtils.get("#journal-content div.journal").remove();
            DOMUtils.get("#journal-content").append(this.journal.render());
            $("#meeting-journal").modal("toggle");
        });

        DOMUtils.get("#generate-journal").addEventListener("click", () => {
            this.journal.download();
        });
        DOMUtils.get("#apply-virtual-bg").addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
            const track = this.localMediaStream.getVideoTracks()[0]
            track.applyConstraints({ width: 800, height: 450 });
            this.greenScreen.setMediaTrack(track);
            $("#gss").modal("toggle");
        });

        DOMUtils.get("#remove-virtual-bg").addEventListener("click", () => {
            this.getLocalStream(UserSettings.defaultConstraints(), (mediaStream: MediaStream) => {
                const track = this.localMediaStream.getVideoTracks()[0];
                this.localMediaStream.removeTrack(track);
                this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
                DOMUtils.get("#apply-virtual-bg").classList.toggle("hide");
                DOMUtils.get("#remove-virtual-bg").classList.toggle("hide");
                this.greenScreen.stop();
            });
        });

        DOMUtils.makeDraggable(DOMUtils.get(".local"));

        this.textToSpeech.addEventListener("click", () => {

            if (this.textToSpeech.checked) {
                DOMUtils.get(".text-to-speech").classList.remove("hide");
            } else {
                DOMUtils.get(".text-to-speech").classList.add("hide");
            }

        });

        let toggleRecord = DOMUtils.get("#record-all") as HTMLAudioElement;


        this.pictureInPictureElement = DOMUtils.get("#pip-stream") as HTMLVideoElement;

        this.pictureInPictureElement.addEventListener('enterpictureinpicture', () => {
            this.pictureInPictureElement.play();
            this.pictureInPicture.classList.toggle("flash");


        });

        this.pictureInPictureElement.addEventListener('leavepictureinpicture', () => {
            this.pictureInPicture.classList.toggle("flash");
            this.mediaStreamBlender.render(0);
            this.mediaStreamBlender.audioSources.clear();
            this.mediaStreamBlender.videosSources.clear();
            this.pictureInPicture.classList.toggle("flash");
            this.pictureInPictureElement.pause();
        });

        this.pictureInPicture.addEventListener("click", () => {

            if (this.isRecording) return;
            this.pictureInPicture.classList.toggle("flash");


            if (document["pictureInPictureElement"]) {
                document["exitPictureInPicture"]()
                    .catch(error => {
                        // Error handling
                    })
            } else {
                this.mediaStreamBlender.audioSources.clear();
                this.mediaStreamBlender.videosSources.clear();

                Array.from(this.participants.values()).forEach((p: AppParticipantComponent) => {
                    this.mediaStreamBlender.addTracks(p.id, p.videoTracks.concat(p.audioTracks), false);
                });
                this.mediaStreamBlender.addTracks("self", this.localMediaStream.getTracks(), true)


                this.mediaStreamBlender.refreshCanvas();

                this.mediaStreamBlender.render(15);
                this.pictureInPictureElement.onloadeddata = () => {
                    this.pictureInPictureElement["requestPictureInPicture"]();
                }
                this.pictureInPictureElement.srcObject = this.mediaStreamBlender.captureStream();
            }
        });

        nickname.value = this.userSettings.nickname;
        this.languagePicker.value = this.userSettings.language;

        this.videoGrid.addEventListener("click", () => {
            this.videoGrid.classList.remove("blur");
        });

        this.lockContext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("lockContext", {});
        });

        MediaUtils.getMediaDevices().then((devices: Array<MediaDeviceInfo>) => {
            // Another option to get the devices
            // let deviceHash = {
            //     'videoinput': [videoDevice, this.userSettings.videoDevice],
            //     'audioinput': [audioDeviceIn, this.userSettings.audioDeviceIn],
            //     'audiooutput': [audioDeviceOut, this.userSettings.audioDeviceOut]
            // };
            devices.forEach((d: MediaDeviceInfo, index: number) => {
                let option = document.createElement("option");

                option.textContent = d.label || `Device #${index} (name unknown)`;
                option.value = d.deviceId;

                switch (d.kind) {
                    case 'videoinput':
                        option.selected = option.value === this.userSettings.videoDevice;
                        videoDevice.append(option);
                        break;
                    case 'audioinput':
                        option.selected = option.value === this.userSettings.audioDeviceIn;
                        audioDeviceIn.append(option);
                        break;
                    case 'audiooutput':
                        option.selected = option.value === this.userSettings.audioDeviceOut;
                        audioDeviceOut.append(option);
                        break;
                }

                // let [device, selection] = deviceHash[d.kind];
                // option.selected = option.value === selection;
                // (device as HTMLInputElement).append(option);
            });

        }).catch(console.error);

        saveSettings.addEventListener("click", () => {
            this.userSettings.nickname = nickname.value;
            this.userSettings.audioDeviceIn = audioDeviceIn.value;
            this.userSettings.audioDeviceOut = audioDeviceOut.value;
            this.userSettings.language = this.languagePicker.value;

            if (this.transcriber)
                this.generateSubtitles.click();

            if (this.userSettings.videoDevice != videoDevice.value ||
                this.userSettings.videoResolution != videoResolution.value) {

                this.userSettings.videoDevice = videoDevice.value;
                this.userSettings.videoResolution = videoResolution.value;

                let localVideos = DOMUtils.getAll("video.local-cam");

                if (!!localVideos && localVideos.length > 0) {
                    localVideos.forEach(el => el.remove());
                }

                this.localMediaStream.getTracks().forEach(track => {
                    this.localMediaStream.removeTrack(track);
                });
                this.getLocalStream(UserSettings.createConstraints(
                    this.userSettings.videoDevice,
                    this.userSettings.videoResolution),
                    (ms: MediaStream) => {
                        this.addLocalVideo(ms, true);
                        ms.getTracks().forEach(track => this.localMediaStream.addTrack(track))
                    });
            }


            this.userSettings.saveSetting();

            $("#settings-modal").modal("toggle");
        });
        settings.addEventListener("click", () => {
            $("#settings-modal").modal("toggle");
        })
        // jQuery hacks for file share etc
        $('.modal').on('shown.bs.modal', function () {
            $(".popover").popover("hide");
        });



        DOMUtils.get<HTMLInputElement>("input.file-selected").addEventListener("change", (evt: any) => {
            const file = evt.target.files[0];
            this.sendFile(file);
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


            if (!this.transcriber) {
                this.transcriber = new Transcriber(this.rtcClient.LocalPeerId,
                    new MediaStream(this.rtcClient.LocalStreams[0].getAudioTracks()), this.userSettings.language
                );

                this.transcriber.onInterim = (interim, final, lang) => {
                    DOMUtils.get("#final-result").textContent = final;
                    DOMUtils.get("#interim-result").textContent = interim;

                }
                this.transcriber.onFinal = (peerId, result, lang) => {
                    this.arbitraryChannel.Invoke("transcript", {
                        peerId: peerId,
                        text: result,
                        lang: lang,
                        sender: this.userSettings.nickname
                    });
                    this.journal.add(this.userSettings.nickname, result, "", lang);
                }
                this.transcriber.start();
                this.generateSubtitles.classList.toggle("flash");
                DOMUtils.get(".transcript-bar").classList.remove("hide");
                this.transcriber.onStop = () => {
                    DOMUtils.get(".transcript-bar").classList.add("hide");
                    this.generateSubtitles.classList.remove("flash");
                    this.transcriber = null;
                }
            } else {
                if (this.transcriber)

                    this.transcriber.stop();

            }
        });



        muteSpeakers.addEventListener("click", () => {
            muteSpeakers.classList.toggle("fa-volume-mute");
            muteSpeakers.classList.toggle("fa-volume-up");
            this.audioNodes.toggleMuteAll();
        });

        muteAudio.addEventListener("click", (e) => {
            if (!this.textToSpeech.checked)
                DOMUtils.get(".text-to-speech").classList.toggle("hide")
            this.muteAudio(e)
        });
        muteVideo.addEventListener("click", (e) => {
            this.muteVideo(e)
        });

        toggleRecord.addEventListener("click", () => {
            toggleRecord.classList.toggle("flash");
            this.recordAllStreams();

        });

        startScreenShare.addEventListener("click", () => {
            this.shareScreen();
        });

        DOMUtils.get("button#share-link").addEventListener("click", (e: any) => {
            navigator.clipboard.writeText(`${this.appDomain.host}/#${slug.value}`).then(() => {
                e.target.textContent = "Copied!"
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
            if (!this.chatWindow.classList.contains("d-none")) {
                chatMessage.focus();
            }
        });

        this.languagePicker.addEventListener("change", () => {
            this.userSettings.language = this.languagePicker.value;
        });

        DOMUtils.get("#sel-video").addEventListener("change", (evt: any) => {
            const deviceId = evt.target.value;
            const constraints = UserSettings.createConstraints(deviceId);
            this.getLocalStream(constraints, (cs: MediaStream) => {
                DOMUtils.get<HTMLVideoElement>("#video-preview").srcObject = cs;

            });
        });

        DOMUtils.get("#sel-video-res").addEventListener("change", (evt: any) => {

            const deviceId = DOMUtils.get<HTMLInputElement>("#sel-video").value;

            const resolution = evt.target.value;
            const constraints = UserSettings.createConstraints(deviceId, resolution);

            DetectResolutions.tryCandidate(deviceId, constraints.video).then((ms: MediaStream) => {
                DOMUtils.get<HTMLVideoElement>("#video-preview").srcObject = ms;
                $("#sel-video-res").popover("hide");
                DOMUtils.get<HTMLButtonElement>("#save-settings").disabled = false;
            }).catch(() => {
                $("#sel-video-res").popover("show");
                DOMUtils.get<HTMLButtonElement>("#save-settings").disabled = true;
            });
        });

        $("#settings-modal").on('show.bs.modal', () => {
            const constraints = UserSettings.createConstraints(this.userSettings.videoDevice, this.userSettings.videoResolution);
            this.getLocalStream(constraints, (cs: MediaStream) => {
                (DOMUtils.get("#video-preview") as HTMLVideoElement).srcObject = cs;
            });
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

        this.leaveContext.addEventListener("click", () => {
            this.factory.GetController("broker").Invoke("leaveContext", {})
        })

        this.startButton.addEventListener("click", () => {
            this.enableConferenceElements();
            this.journal = new JournalComponent();
            this.userSettings.slugHistory.addToHistory(slug.value);
            this.userSettings.saveSetting();
            this.factory.GetController("broker").Invoke("changeContext", {
                context: this.appDomain.getSlug(slug.value),
                audio: MediaUtils.CheckStream(this.localMediaStream.getAudioTracks(), "live"),
                video: MediaUtils.CheckStream(this.localMediaStream.getVideoTracks(), "live")
            });

            window.history.pushState({}, window.document.title, `#${slug.value}`);

            setTimeout(() => {
                DOMUtils.get("#share-container").classList.toggle("d-none");
            }, 5000)

        });


        chatMessage.addEventListener("keydown", (e) => {
            if (e.keyCode == 13) {
                this.sendMessage(this.userSettings.nickname, chatMessage.value)
                chatMessage.value = "";
            }
        });

        this.textToSpeechMessage.addEventListener("keydown", (e) => {
            if (e.keyCode == 13) {
                //this.sendMessage(this.userSettings.nickname, chatMessage.value)
                this.arbitraryChannel.Invoke("textToSpeech", {
                    text: this.textToSpeechMessage.value,
                    peerId: this.rtcClient.LocalPeerId,
                    lang: this.userSettings.language || navigator.language
                });
                this.textToSpeechMessage.value = "";
            }
        });


        /*
            Parse hotkeys
        */

        DOMUtils.getAll("*[data-hotkey]").forEach((el: HTMLElement) => {
            const keys = el.dataset.hotkey;
            hotkeys(keys, function (e: KeyboardEvent, h: HotkeysEvent) {
                el.click();
                event.preventDefault()
            });
        });

        hotkeys("ctrl+o", (e: KeyboardEvent, h: HotkeysEvent) => {
            this.factory.GetController("broker").Invoke("onliners", {});
            event.preventDefault()
        });

        hotkeys("ctrl+l", (e: KeyboardEvent, h: HotkeysEvent) => {
            this.arbitraryChannel.Invoke("lowresRequest", { peerId: this.rtcClient.LocalPeerId });
            event.preventDefault()
        });


        this.factory.OnClose = (reason: any) => {
            console.error(reason);
        }
        this.factory.OnOpen = (broker: Controller) => {

            this.rtcClient = new WebRTC(broker, this.rtcConfig);
            // set up peer dataChannels 
            this.arbitraryChannel = this.rtcClient.CreateDataChannel(`arbitrary-${this.appDomain.contextPrefix}-dc`);
            this.fileChannel = this.rtcClient.CreateDataChannel(`blob-${this.appDomain.contextPrefix}-dc`);
            this.fileChannel.On("fileShare", (fileInfo: any, arrayBuffer: ArrayBuffer) => {
                this.displayReceivedFile(fileInfo, new Blob([arrayBuffer], {
                    type: fileInfo.mimeType
                }));
            });
            this.arbitraryChannel.On("lowresRequest", (data: any) => {
                let rtpsenders = this.rtcClient.getRtpSenders(data.peerId);
                rtpsenders.forEach((sender: RTCRtpSender) => {
                    if (sender.track.kind === "video") {
                        // apply (240p ~ youTube "240p" mode)
                        sender.track.applyConstraints({
                            width: 426,
                            height: 240,
                        })
                    }
                });
            });

            this.arbitraryChannel.On("textToSpeech", (data: any) => {
                let targetLanguage =
                    this.userSettings.language
                    || navigator.language;
                if (data.lang !== targetLanguage && this.appDomain.translateKey) {
                    Transcriber.translateCaptions(this.appDomain.translateKey, data.text, data.lang, this.userSettings.language
                        || navigator.language).then((result) => {
                            Transcriber.textToSpeech(result, targetLanguage);
                            // this.addSubtitles(parent, result, data.lang, data.text);
                        }).catch(() => {
                            //this.addSubtitles(parent, data.text, data.lang);
                        });
                } else {
                    Transcriber.textToSpeech(data.text, targetLanguage);
                }
            });

            this.arbitraryChannel.On("transcript", (data: any) => {
                let parent = DOMUtils.get(`.subs${data.peerId}`);
                if (parent) {
                    let targetLanguage =
                        this.userSettings.language
                        || navigator.language;
                    targetLanguage = targetLanguage.indexOf("-") > -1 ? targetLanguage.substr(0, 2) : targetLanguage;

                    if (data.lang !== targetLanguage && this.appDomain.translateKey) {
                        Transcriber.translateCaptions(this.appDomain.translateKey, data.text, data.lang, this.userSettings.language
                            || navigator.language).then((result) => {
                                this.addSubtitles(parent, result, data.lang, data.text);
                                this.journal.add(data.sender, result, data.text, data.lang);

                            }).catch(() => {
                                this.addSubtitles(parent, data.text, data.lang);
                                this.journal.add(data.sender, data.text, "", data.lang);
                            });
                    } else {
                        this.journal.add(data.sender, data.text, "", data.lang);
                        this.addSubtitles(parent, data.text, data.lang);
                    }
                }
            });

            this.arbitraryChannel.On("chatMessage", (data: any) => {
                this.displayChatMessage(data);
            });

            this.arbitraryChannel.On("isSpeaking", (data: any) => {
                let m = DOMUtils.get(`.n${data.peerId}`);
                if (m) {
                    if (data.state) {
                        m.classList.add("is-speaking");
                    } else {
                        m.classList.remove("is-speaking");
                    }
                }
            });
            this.arbitraryChannel.OnOpen = (e, peerId) => {
            };

            broker.On("leaveContext", (data: any) => {
                this.rtcClient.Peers.forEach((connection: WebRTCConnection) => {
                    connection.RTCPeer.close();
                });
                this.participants.clear();
                DOMUtils.get("#remote-videos").innerHTML = "";
                this.disableConferenceElements();
            });
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


            broker.On("onliners", (data) => {
                console.log("onliners", data);
            });

            broker.On("nicknameChange", (data) => {
                let n = DOMUtils.get(`.n${data.peerId}`);
                if (n)
                    n.textContent = data.nickname;
            });
            broker.On("whois", (data) => {
                let n = DOMUtils.get(`.n${data.peerId}`);
                if (n)
                    n.textContent = data.nickname;
            });
            this.rtcClient.OnLocalStream = (mediaStream: MediaStream) => {
            }
            this.rtcClient.OnContextCreated = (ctx) => {
            };
            this.rtcClient.OnContextChanged = (ctx) => {
                this.rtcClient.ConnectContext();
            }
            this.rtcClient.OnContextDisconnected = (peer) => {
                this.participants.delete(peer.id);
                DOMUtils.getAll(`li.p${peer.id}`).forEach(n => n.remove());
              
                this.factory.GetController("broker").Invoke("onliners", {}); // refresh onliners
            };
            this.rtcClient.OnContextConnected = (peer) => {
                DOMUtils.get(".remote").classList.add("hide");
                this.factory.GetController("broker").Invoke("onliners", {}); // refresh onliners

            }
            this.rtcClient.OnRemoteTrack = (track: MediaStreamTrack, connection: any) => {
                let participant = this.tryAddParticipant(connection.id);
                participant.addTrack(track);
                // who is?
                this.factory.GetController("broker").Invoke("whois", connection.id);
            }

            broker.OnOpen = (ci: any) => {
                if (slug.value.length >= 6) {
                    this.factory.GetController("broker").Invoke("isRoomLocked", this.appDomain.getSlug(slug.value));
                }
                this.factory.GetController("broker").Invoke("setNickname", `@${nickname.value}`);
                //this.userSettings.createConstraints(this.userSettings.videoResolution)
                this.getLocalStream(
                    UserSettings.defaultConstraints(
                        this.userSettings.videoDevice, this.userSettings.videoResolution,true
                    ),
                    (mediaStream: MediaStream) => {
                        //  remove local video track
                        if (location.search.includes("novideo"))
                            mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);


                        this.speechDetector = new SpeechDetector(mediaStream, 5, 512);

                        this.speechDetector.start(2000);

                        this.speechDetector.onspeechstarted = (rms) => {
                            this.arbitraryChannel.Invoke("isSpeaking", {
                                state: true,
                                rms: rms, peerId: this.rtcClient.LocalPeerId
                            });
                        };
                        this.speechDetector.onspeechended = (rms) => {
                            this.arbitraryChannel.Invoke("isSpeaking", {
                                state: false,
                                rms: rms, peerId: this.rtcClient.LocalPeerId
                            });
                        };

                        DOMUtils.get("#await-streams").classList.toggle("hide");
                        DOMUtils.get("#has-streams").classList.toggle("hide");
                        this.localMediaStream = mediaStream;
                        this.rtcClient.AddLocalStream(this.localMediaStream);
                        this.addLocalVideo(this.localMediaStream,true);
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

    const instrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    if (!!instrumentationKey) {
        const appInsights = new ApplicationInsights({ config: { instrumentationKey: instrumentationKey } });
        appInsights.loadAppInsights();
        appInsights.trackPageView();
    }

    App.getInstance();
});
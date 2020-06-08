import adapter from 'webrtc-adapter';
import { Factory, WebRTC, BinaryMessage, Message, DataChannel, PeerChannel, Utils, Listener } from 'thor-io.client-vnext'
import { Controller } from 'thor-io.client-vnext/src/Controller';
import { AppParticipantComponent } from './Components/AppParticipantComponent';
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
import { AppBase } from './AppBase';
import { PeerConnection } from 'thor-io.client-vnext/src/WebRTC/PeerConnection';
import 'reflect-metadata';
import { FileShareComponent } from './Components/FileshareComponent';
import { ChatComponent } from './Components/ChatComponent';



export class App extends AppBase {
   


    mediaStreamBlender: MediaStreamBlender;
    audioNodes: AudioNodes;

    fileChannel: DataChannel;
    arbitraryChannel: DataChannel;

    participants: Map<string, AppParticipantComponent>;
    transcriber: Transcriber;

    numUnreadMessages: number = 0;
    numOfPeers: number = 0;
    heartbeat: number = 0;

    slug: string;
    isRecording: boolean;

    videoGrid: HTMLElement;
    chatWindow: HTMLElement;
    unreadBadge: HTMLElement;
    leaveContext: HTMLElement;
    startButton: HTMLInputElement;
    shareSlug: HTMLElement;
    lockContext: HTMLElement;
    generateSubtitles: HTMLElement;

    languagePicker: HTMLInputElement;
    pictureInPictureElement: HTMLVideoElement;
    textToSpeech: HTMLInputElement;
    textToSpeechMessage: HTMLInputElement;

    contextName: HTMLInputElement;

    nickname: HTMLInputElement;
    localMediaStream: MediaStream;

    journalComponent: JournalComponent;
    fileshareComponent: FileShareComponent;
    chatComponent: ChatComponent;
    greenScreenComponent: GreenScreenComponent;

    speechDetector: SpeechDetector;
    isPipActive: boolean;

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

            navigator.mediaDevices.getUserMedia(UserSettings.failSafeConstraints()).then((mediaStream: MediaStream) => {
                cb(mediaStream);
            }).catch(err => {
                AppDomain.logger.error("getLocalStream error", err);
                let supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
                AppDomain.logger.log("The following media constraints are supported");
                for (let constraint in supportedConstraints) {
                    if (supportedConstraints.hasOwnProperty(constraint)) {
                        AppDomain.logger.log(constraint)
                    }
                }
                // unable to get camera, show camera dialog ?
                DOMUtils.get("#await-need-error").classList.toggle("hide");
                DOMUtils.get("#await-need-accept").classList.toggle("hide");
            });
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
                this.rtc.LocalStreams[0].addTrack(t);
                this.rtc.addTrackToPeers(t);
            });
            this.addLocalVideo(stream, false);
        }).catch(err => {
            AppDomain.logger.error("shareScreen", err)
        })
    }


    refreshPiP() {
       
   
        this.mediaStreamBlender.audioSources.clear();
        this.mediaStreamBlender.videosSources.clear();
        Array.from(this.participants.values()).forEach((p: AppParticipantComponent) => {
            this.mediaStreamBlender.addTracks(p.id, p.videoTracks.concat(p.audioTracks), false);
        });
        this.mediaStreamBlender.addTracks("self", this.localMediaStream.getTracks(), true)
        this.mediaStreamBlender.refreshCanvas();
        this.pictureInPictureElement.srcObject = this.mediaStreamBlender.captureStream();

        if(!this.mediaStreamBlender.isRendering)
            this.mediaStreamBlender.render(15);
      
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
            this.rtc.removeTrackFromPeers(track);
            this.localMediaStream.removeTrack(track);
            DOMUtils.get(".l-" + track.id).remove();
        };
        let container = DOMUtils.get(".local") as HTMLElement;
        container.append(video);
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
    /**
     *
     *
     * @param {HTMLElement} parent
     * @param {string} text
     * @param {string} lang
     * @param {string} [title]
     * @memberof App
     */
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
    /**
     *
     *
     * @memberof App
     */
    disableConferenceElements() {
        location.hash = "";
        DOMUtils.get("#mute-speakers").classList.toggle("hide");
        this.generateSubtitles.classList.toggle("hide");

        let slug = DOMUtils.get("#context-name") as HTMLInputElement;

        if ('pictureInPictureEnabled' in document)
            DOMUtils.get("#toggle-pip").classList.toggle("hide");

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
    /**
     *
     *
     * @memberof App
     */
    enableConferenceElements() {

        DOMUtils.get("#mute-speakers").classList.toggle("hide");

        if ('pictureInPictureEnabled' in document)
            DOMUtils.get("#toggle-pip").classList.toggle("hide");

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
        DOMUtils.get("#show-chat").classList.toggle("d-none");
        DOMUtils.get(".our-brand").classList.toggle("hide");
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


    createSpeechDetecor(ms: MediaStream, interval: number) {
        try {

            this.speechDetector = new SpeechDetector(ms, 5, 512);
            this.speechDetector.start(interval);
            AppDomain.logger.log(`SpeechDetector has started`)
            this.speechDetector.onspeechstarted = (rms) => {
                this.arbitraryChannel.Invoke("isSpeaking", {
                    state: true,
                    rms: rms, peerId: this.rtc.LocalPeerId
                });
            };
            this.speechDetector.onspeechended = (rms) => {
                this.arbitraryChannel.Invoke("isSpeaking", {
                    state: false,
                    rms: rms, peerId: this.rtc.LocalPeerId
                });
            };

        } catch (err) {
            AppDomain.logger.log(`failed to create SpeechDetector has started`, err)
        }

    }

    private onContextDisconnected(peer: any) {
        this.participants.delete(peer.id);
        if(this.isPipActive) this.refreshPiP();
    
        DOMUtils.getAll(`li.p${peer.id}`).forEach(n => n.remove());

        this.factory.GetController("broker").Invoke("onliners", {}); // refresh onliner
    }


    private onContextConnected() {
        DOMUtils.get(".remote").classList.add("hide");
        this.factory.GetController("broker").Invoke("onliners", {}); // refresh onliners
    }

    private onContextCreated(peerConnection: PeerConnection) {
    }

    private onContextChanged(context: any) {
        this.rtc.ConnectContext();
    }

    private onLocalStream() {
    }
    private onTranscript(data: any) {
        let parent = DOMUtils.get(`.subs${data.peerId}`);
        if (parent) {
            let targetLanguage =
                UserSettings.language
                || navigator.language;

            targetLanguage = targetLanguage.indexOf("-") > -1 ? targetLanguage.substr(0, 2) : targetLanguage;
            if (data.lang !== targetLanguage && AppDomain.translateKey) {
                Transcriber.translateCaptions(AppDomain.translateKey, data.text, data.lang, UserSettings.language
                    || navigator.language).then((result) => {
                        this.addSubtitles(parent, result, data.lang, data.text);
                        this.journalComponent.add(data.sender, result, data.text, data.lang);

                    }).catch(() => {
                        this.addSubtitles(parent, data.text, data.lang);
                        this.journalComponent.add(data.sender, data.text, "", data.lang);
                    });
            } else {
                this.journalComponent.add(data.sender, data.text, "", data.lang);
                this.addSubtitles(parent, data.text, data.lang);
            }
        }
    }

    private onSpeaking(data: any) {
        let m = DOMUtils.get(`.n${data.peerId}`);
        if (m) {
            if (data.state) {
                m.classList.add("is-speaking");
            } else {
                m.classList.remove("is-speaking");
            }
        }
    }

    private onTextToSpeech(data: any) {
        let targetLanguage =
            UserSettings.language
            || navigator.language;
        if (data.lang !== targetLanguage && AppDomain.translateKey) {
            Transcriber.translateCaptions(AppDomain.translateKey, data.text, data.lang, UserSettings.language
                || navigator.language).then((result) => {
                    Transcriber.textToSpeech(result, targetLanguage);
                }).catch(err => {
                });
        } else {
            Transcriber.textToSpeech(data.text, targetLanguage);
        }
    }

    private onLowresRequest(data: any) {
        let rtpsenders = this.rtc.getRtpSenders(data.peerId);
        rtpsenders.forEach((sender: RTCRtpSender) => {
            if (sender.track.kind === "video") {
                sender.track.applyConstraints({
                    width: 426,
                    height: 240,
                })
            }
        });
    }
    private onRemoteTrack(track: MediaStreamTrack, connection: WebRTCConnection) {
        let participant = this.tryAddParticipant(connection.id);
        participant.addTrack(track);
        this.factory.GetController("broker").Invoke("whois", connection.id);
        if(this.isPipActive) this.refreshPiP();
    }

    private onLeaveContext() {
        this.rtc.Peers.forEach((connection: WebRTCConnection) => {
            connection.RTCPeer.close();
        });
        this.participants.clear();
        DOMUtils.get("#remote-videos").innerHTML = "";
        this.disableConferenceElements();

    }

    private onLockContext() {
        this.lockContext.classList.toggle("fa-lock-open");
        this.lockContext.classList.toggle("fa-lock");
    }

    private onIsRoomLocked(data: any) {
        let slug = DOMUtils.get<HTMLInputElement>("#context-name");
        this.startButton.disabled = data.state;
        if (data.state) {
            slug.classList.add("is-invalid");
        } else {
            slug.classList.remove("is-invalid");
        }
    }

    private onWhoIs(data: any) {
        let n = DOMUtils.get(`.n${data.peerId}`);
        if (n)
            n.textContent = data.nickname;

    }

    private onNicknameChange(data: any) {
        let n = DOMUtils.get(`.n${data.peerId}`);
        if (n)
            n.textContent = data.nickname;
    }


    private onBrokerOpen(connectionInfo: any) {


        this.factory.GetController("broker").Invoke("setNickname", `@${this.nickname.value}`);

        let contextName = DOMUtils.get<HTMLInputElement>("#context-name");
        if (contextName.value.length >= 6) {
            this.factory.GetController("broker").Invoke("isRoomLocked", AppDomain.getSlug(contextName.value));
        }

        this.getLocalStream(
            UserSettings.defaultConstraints(
                UserSettings.videoDevice, UserSettings.videoResolution, true
            ),
            (mediaStream: MediaStream) => {
                AppDomain.logger.log(`OnOpen - Mediastream ${mediaStream.id}`);
                if (location.search.includes("novideo"))
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                AppDomain.logger.log(`OnOpen mediastream has ${mediaStream.getTracks().length} tracks`)

                this.createSpeechDetecor(mediaStream, 2000);

                DOMUtils.get("#await-streams").classList.toggle("hide");
                DOMUtils.get("#has-streams").classList.toggle("hide");
                this.localMediaStream = mediaStream;
                this.rtc.AddLocalStream(this.localMediaStream);
                this.addLocalVideo(this.localMediaStream, true);

            });


        this.factory.GetController("broker").On("pong", (data: any) => {
            this.heartbeat = data.ts;
        });


        setInterval(() => {
            this.factory.GetController("broker").Invoke("ping", performance.now().toFixed(0));
        }, 1000*20);

    }

    onInitlialized(broker: Controller) {

        this.rtc.OnLocalStream = this.onLocalStream.bind(this);
        this.rtc.OnContextCreated = this.onContextCreated.bind(this);
        this.rtc.OnContextChanged = this.onContextChanged.bind(this);
        this.rtc.OnContextDisconnected = this.onContextDisconnected.bind(this);
        this.rtc.OnContextConnected = this.onContextConnected.bind(this);

        this.rtc.OnRemoteTrack = this.onRemoteTrack.bind(this);

        this.arbitraryChannel = this.rtc.CreateDataChannel(`arbitrary-${AppDomain.contextPrefix}-dc`);

        this.chatComponent = new ChatComponent(this.arbitraryChannel, UserSettings);


        this.fileshareComponent = new FileShareComponent(this.rtc.CreateDataChannel(`blob-${AppDomain.contextPrefix}-dc`),
            UserSettings
        );

        this.chatComponent.onChatMessage = () => {
            this.numUnreadMessages++;
            if (this.chatWindow.classList.contains("d-none")) {
                this.unreadBadge.classList.remove("d-none");

                this.unreadBadge.textContent = this.numUnreadMessages.toString();
            }
        }

        this.fileshareComponent.onFileReceived = () => {
            this.numUnreadMessages++;
            if (this.chatWindow.classList.contains("d-none")) {
                this.unreadBadge.classList.remove("d-none");
                this.unreadBadge.textContent = this.numUnreadMessages.toString();
            }
        }

        this.arbitraryChannel.On("lowresRequest", this.onLowresRequest.bind(this));
        this.arbitraryChannel.On("textToSpeech", this.onTextToSpeech.bind(this));

        this.arbitraryChannel.On("transcript", this.onTranscript.bind(this));
        this.arbitraryChannel.On("isSpeaking", this.onSpeaking.bind(this));

        broker.OnOpen = this.onBrokerOpen.bind(this);

        broker.On("leaveContext", this.onLeaveContext.bind(this));
        broker.On("lockContext", this.onLockContext.bind(this));
        broker.On("isRoomLocked", this.onIsRoomLocked.bind(this));
        broker.On("nicknameChange", this.onNicknameChange.bind(this));
        broker.On("whois", this.onWhoIs.bind(this));

        broker.Connect();

    }
    /**
     *Creates an instance of App.
     * @memberof App
     */
    constructor() {
        super();

        this.numUnreadMessages = 0;
        this.participants = new Map<string, AppParticipantComponent>();

        // add language options to UserSettings 
        DOMUtils.get("#languages").append(Transcriber.getlanguagePicker());
        DOMUtils.get("#appDomain").textContent = AppDomain.domain;
        DOMUtils.get("#appVersion").title = AppDomain.version;

        this.slug = location.hash.replace("#", "");


        this.generateSubtitles = DOMUtils.get("#subtitles");


        this.videoGrid = DOMUtils.get("#video-grid");
        this.chatWindow = DOMUtils.get(".chat");

        this.lockContext = DOMUtils.get("#context-lock");
        this.unreadBadge = DOMUtils.get("#unread-messages");
        this.leaveContext = DOMUtils.get("#leave-context");
        this.startButton = DOMUtils.get<HTMLInputElement>("#join-conference");
        this.shareSlug = DOMUtils.get("#share-slug");
        this.languagePicker = DOMUtils.get<HTMLInputElement>(".selected-language");
        this.pictureInPictureElement = DOMUtils.get<HTMLVideoElement>("#pip-stream");

        this.textToSpeech = DOMUtils.get<HTMLInputElement>("#show-text-to-speech");
        this.textToSpeechMessage = DOMUtils.get<HTMLInputElement>("#text-message");

        this.nickname = DOMUtils.get<HTMLInputElement>("#txt-nick");
        this.contextName = DOMUtils.get("#context-name") as HTMLInputElement;

        let muteAudio = DOMUtils.get("#mute-local-audio");
        let muteVideo = DOMUtils.get("#mute-local-video");
        let muteSpeakers = DOMUtils.get("#mute-speakers");


        let videoDevice = DOMUtils.get<HTMLInputElement>("#sel-video")
        let audioDeviceIn = DOMUtils.get<HTMLInputElement>("#sel-audio-in");
        let audioDeviceOut = DOMUtils.get<HTMLInputElement>("#sel-audio-out");
        let videoResolution = DOMUtils.get<HTMLInputElement>("#sel-video-res");


        UserSettings.load()

        UserSettings.cameraResolutions(UserSettings.videoResolution);

        this.nickname.value = UserSettings.nickname;


        this.audioNodes = new AudioNodes();
        this.mediaStreamBlender = new MediaStreamBlender();

        if (this.slug.length >= 6) {
            this.contextName.value = this.slug;
            this.startButton.disabled = false;
            this.startButton.textContent = "JOIN";
            DOMUtils.get("#random-slug").classList.add("d-none"); // if slug predefined, no random option...
        }


        // Remove screenShare on tables / mobile hack..
        if (typeof window.orientation !== 'undefined') {
            DOMUtils.getAll(".only-desktop").forEach(el => el.classList.add("hide"));
        }

        let blenderWaterMark = DOMUtils.get<HTMLImageElement>("#watermark");

        this.mediaStreamBlender.onFrameRendered = (ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.filter = "invert()";
            ctx.drawImage(blenderWaterMark, 10, 10, 100, 100);
            ctx.restore();
        }
        this.mediaStreamBlender.onTrack = () => {
            this.mediaStreamBlender.refreshCanvas();
        }
        this.mediaStreamBlender.onRecordingStart = () => {
            this.chatComponent.sendMessage(UserSettings.nickname, "I'm now recording the session.");
        }
        this.mediaStreamBlender.onRecordingEnded = (blobUrl: string) => {
            this.displayRecording(blobUrl);
        };
        this.mediaStreamBlender.onTrackEnded = () => {
            try {
                this.mediaStreamBlender.refreshCanvas();
            } catch (err) {
                AppDomain.logger.error("mediaStreamBlender onTrackEnded", err);
            }
        }
        this.greenScreenComponent = new GreenScreenComponent("gss");
        this.greenScreenComponent.onApply = (mediaStream) => {
            DOMUtils.get("video#preview").remove()
            let a = this.localMediaStream.getVideoTracks()[0];
            this.localMediaStream.removeTrack(a);
            this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
            DOMUtils.get("#apply-virtual-bg").classList.toggle("hide");
            DOMUtils.get("#remove-virtual-bg").classList.toggle("hide");
        };

        DOMUtils.get("#components").append(this.greenScreenComponent.render());

        DOMUtils.on("click", "#apply-virtual-bg", () => {
            $("#settings-modal").modal("toggle");
            const track = this.localMediaStream.getVideoTracks()[0]
            track.applyConstraints({ width: 640, height: 360 });
            this.greenScreenComponent.setMediaTrack(track);
            $("#gss").modal("toggle");
        });

        DOMUtils.on("click", "#remove-virtual-bg", () => {
            this.getLocalStream(UserSettings.defaultConstraints(UserSettings.videoDevice, UserSettings.videoResolution, true
            ), (mediaStream: MediaStream) => {
                const track = this.localMediaStream.getVideoTracks()[0];
                this.localMediaStream.removeTrack(track);
                this.localMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
                DOMUtils.get("#apply-virtual-bg").classList.toggle("hide");
                DOMUtils.get("#remove-virtual-bg").classList.toggle("hide");
                this.greenScreenComponent.stop();
            });
        });

        // DOMUtils.on("click", "button#apply-fail-save-constraints", () => {
        //     this.getLocalStream(
        //         UserSettings.failSafeConstraints(),
        //         (mediaStream: MediaStream) => {
        //             DOMUtils.get("#await-streams").classList.toggle("hide");
        //             DOMUtils.get("#has-streams").classList.toggle("hide");
        //             this.localMediaStream = mediaStream;
        //             this.rtc.AddLocalStream(this.localMediaStream);
        //             this.addLocalVideo(this.localMediaStream, true);
        //         });
        // });

        DOMUtils.on("click", "#show-journal", () => {
            DOMUtils.get("#generate-journal").textContent = "Download";
            if (this.journalComponent.data.length > 0)
                DOMUtils.get("#journal-content div.journal").remove();
            DOMUtils.get("#journal-content").append(this.journalComponent.render());
            $("#meeting-journal").modal("toggle");
        });

        DOMUtils.on("click", "#generate-journal", () => {
            this.journalComponent.download();
        });

        DOMUtils.makeDraggable(DOMUtils.get(".local"));

        DOMUtils.on("click", this.textToSpeech, () => {
            if (this.textToSpeech.checked) {
                DOMUtils.get(".text-to-speech").classList.remove("hide");
            } else {
                DOMUtils.get(".text-to-speech").classList.add("hide");
            }
        });

        DOMUtils.on("enterpictureinpicture", this.pictureInPictureElement, () => {
            this.pictureInPictureElement.play();
            DOMUtils.get("#toggle-pip").classList.toggle("flash");
        });

        DOMUtils.on("leavepictureinpicture", this.pictureInPictureElement, () => {
            DOMUtils.get("#toggle-pip").classList.toggle("flash");
            this.mediaStreamBlender.render(0);
            this.mediaStreamBlender.audioSources.clear();
            this.mediaStreamBlender.videosSources.clear();
            DOMUtils.get("#toggle-pip").classList.toggle("flash");
            this.pictureInPictureElement.pause();
        });

        DOMUtils.on("click", DOMUtils.get("#toggle-pip"), () => {
            if (this.isRecording) return;
            if (document["pictureInPictureElement"]) {
                document["exitPictureInPicture"]().then(() => {
                    
                    this.isPipActive = true;
                    
                    DOMUtils.get("#toggle-pip").classList.remove("flash");
                })
                    .catch(err => {
                        this.isPipActive = false;                    
                        DOMUtils.get("#toggle-pip").classList.remove("flash");
                        AppDomain.logger.error("exitPictureInPicture", err)
                    });
            } else {
                
           

                this.pictureInPictureElement.onloadeddata = () => {
                    this.pictureInPictureElement["requestPictureInPicture"]();
                }

                this.refreshPiP()

                this.isPipActive = true;
               

                DOMUtils.get("#toggle-pip").classList.add("flash");
            }
        });

        this.languagePicker.value = UserSettings.language;
        DOMUtils.on("change", this.languagePicker, () => {
            UserSettings.language = this.languagePicker.value;
        });

        DOMUtils.on("click", this.lockContext, () => {
            this.factory.GetController("broker").Invoke("lockContext", {});
        });

        MediaUtils.getMediaDevices().then((devices: Array<MediaDeviceInfo>) => {
            devices.forEach((d: MediaDeviceInfo, index: number) => {
                let option = document.createElement("option");
                option.textContent = d.label || `Device #${index} (name unknown)`;
                option.value = d.deviceId;
                switch (d.kind) {
                    case 'videoinput':
                        option.selected = option.value === UserSettings.videoDevice;
                        videoDevice.append(option);
                        break;
                    case 'audioinput':
                        option.selected = option.value === UserSettings.audioDeviceIn;
                        audioDeviceIn.append(option);
                        break;
                    case 'audiooutput':
                        option.selected = option.value === UserSettings.audioDeviceOut;
                        audioDeviceOut.append(option);
                        break;
                }
            });

        }).catch(err => {
            AppDomain.logger.error("getMediaDevices", err)
        }
        );


        DOMUtils.on("click", DOMUtils.get<HTMLButtonElement>("#save-settings"), () => {
            UserSettings.nickname = this.nickname.value;
            UserSettings.audioDeviceIn = audioDeviceIn.value;
            UserSettings.audioDeviceOut = audioDeviceOut.value;
            UserSettings.language = this.languagePicker.value;

            if (this.transcriber)
                this.generateSubtitles.click();

            if (UserSettings.videoDevice != videoDevice.value ||
                UserSettings.videoResolution != videoResolution.value) {

                UserSettings.videoDevice = videoDevice.value;
                UserSettings.videoResolution = videoResolution.value;

                let localVideos = DOMUtils.getAll("video.local-cam");

                if (!!localVideos && localVideos.length > 0) {
                    localVideos.forEach(el => el.remove());
                }

                this.localMediaStream.getTracks().forEach(track => {
                    this.localMediaStream.removeTrack(track);
                });
                this.getLocalStream(UserSettings.createConstraints(
                    UserSettings.videoDevice,
                    UserSettings.videoResolution),
                    (ms: MediaStream) => {
                        this.addLocalVideo(ms, true);
                        ms.getTracks().forEach(track => this.localMediaStream.addTrack(track))
                    });
            }
            UserSettings.save();
            $("#settings-modal").modal("toggle");
        });


        DOMUtils.on("click", DOMUtils.get("#settings"), () => {
            $("#settings-modal").modal("toggle");
        })


        DOMUtils.on("change", "input.file-selected", (evt: any) => {
            const file = evt.target.files[0];
            this.fileshareComponent.sendFile(file);
        });

        UserSettings.slugHistory.getHistory().forEach((slug: string) => {
            const option = document.createElement("option");
            option.setAttribute("value", slug);
            DOMUtils.get("#context-history").prepend(option);
        });

        DOMUtils.on("click", DOMUtils.get("#generate-slug"), () => {
            this.contextName.value = Math.random().toString(36).substring(2).toLocaleLowerCase();
            this.startButton.disabled = false;
        });


        DOMUtils.on("click", this.generateSubtitles, () => {
            if (!this.transcriber) {
                this.transcriber = new Transcriber(this.rtc.LocalPeerId,
                    new MediaStream(this.rtc.LocalStreams[0].getAudioTracks()), UserSettings.language
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
                        sender: UserSettings.nickname
                    });
                    this.journalComponent.add(UserSettings.nickname, result, "", lang);
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

        DOMUtils.on("click", muteSpeakers, () => {
            muteSpeakers.classList.toggle("fa-volume-mute");
            muteSpeakers.classList.toggle("fa-volume-up");
            this.audioNodes.toggleMuteAll();
        });

        DOMUtils.on("click", muteAudio, (e) => {
            if (!this.textToSpeech.checked)
                DOMUtils.get(".text-to-speech").classList.toggle("hide")
            this.muteAudio(e)
        });

        DOMUtils.on("click", muteVideo, (e) => {
            this.muteVideo(e)
        });

        DOMUtils.on("click", DOMUtils.get("#record-all"), () => {
            DOMUtils.get("#record-all").classList.toggle("flash");
            this.recordAllStreams();
        });

        DOMUtils.on("click", DOMUtils.get("#share-screen"), () => {
            this.shareScreen();
        });

        DOMUtils.on("click", "button#share-link", (e: any) => {
            navigator.clipboard.writeText(`${AppDomain.host}/#${this.contextName.value}`).then(() => {
                e.target.textContent = "Copied!"
            });
        });

        DOMUtils.on("click", this.shareSlug, () => {
            navigator.clipboard.writeText(`${AppDomain.host}/#${this.contextName.value}`).then(() => {
                $("#share-slug").popover("show");
                setTimeout(() => {
                    $("#share-slug").popover("hide");
                }, 5000);
            });
        });


        DOMUtils.on("click", "#close-chat", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numUnreadMessages = 0;
            this.unreadBadge.textContent = "0";

        });

        DOMUtils.on("click", "#show-chat", () => {
            this.chatWindow.classList.toggle("d-none");
            this.unreadBadge.classList.add("d-none");
            this.numUnreadMessages = 0;
            this.unreadBadge.textContent = "0";
            if (!this.chatWindow.classList.contains("d-none")) {
                this.chatComponent.chatMessage.focus();
            }
        });
        DOMUtils.on("change", "#sel-video", (evt: any) => {
            const deviceId = evt.target.value;
            const constraints = UserSettings.createConstraints(deviceId);
            this.getLocalStream(constraints, (cs: MediaStream) => {
                DOMUtils.get<HTMLVideoElement>("#video-preview").srcObject = cs;

            });
        });

        DOMUtils.on("change", "#sel-video-res", (evt: any) => {

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
            const constraints = UserSettings.createConstraints(UserSettings.videoDevice, UserSettings.videoResolution);
            this.getLocalStream(constraints, (cs: MediaStream) => {
                (DOMUtils.get("#video-preview") as HTMLVideoElement).srcObject = cs;
            });
        });


        DOMUtils.on("click", this.contextName, () => {
            $("#context-name").popover('show');
            $("#random-slug").popover("hide");
        });


        DOMUtils.on("keyup", this.contextName, () => {

            if (this.contextName.value.length >= 6) {
                $("#context-name").popover("hide");

                this.factory.GetController("broker").Invoke("isRoomLocked", AppDomain.getSlug(this.contextName.value));
            } else {
                $("#context-name").popover("show");
                this.startButton.disabled = true;
            }
        });

        DOMUtils.on("change", this.nickname, () => {
            this.factory.GetController("broker").Invoke("setNickname", `@${this.nickname.value}`);
        });

        DOMUtils.on("click", this.leaveContext, () => {
            this.factory.GetController("broker").Invoke("leaveContext", {})
            this.speechDetector.stop();
        })

        DOMUtils.on("click", this.startButton, () => {
            this.enableConferenceElements();
            this.journalComponent = new JournalComponent();
            UserSettings.slugHistory.addToHistory(this.contextName.value);
            UserSettings.save();
            this.factory.GetController("broker").Invoke("changeContext", {
                context: AppDomain.getSlug(this.contextName.value),
                audio: MediaUtils.CheckStream(this.localMediaStream.getAudioTracks(), "live"),
                video: MediaUtils.CheckStream(this.localMediaStream.getVideoTracks(), "live")
            });
            window.history.pushState({}, window.document.title, `#${this.contextName.value}`);
            setTimeout(() => {
                DOMUtils.get("#share-container").classList.toggle("d-none");
            }, 5000)
        });


        DOMUtils.on("keydown", this.textToSpeechMessage, (e) => {
            if (e.keyCode == 13) {
                this.arbitraryChannel.Invoke("textToSpeech", {
                    text: this.textToSpeechMessage.value,
                    peerId: this.rtc.LocalPeerId,
                    lang: UserSettings.language || navigator.language
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
            this.arbitraryChannel.Invoke("lowresRequest", { peerId: this.rtc.LocalPeerId });
            event.preventDefault()
        });

        this.initialize().then((broker: any) => {
            if (this.slug.length <= 6)
                $("#random-slug").popover("show");


            this.onInitlialized(broker);
        }).catch(err => {
            AppDomain.logger.error("Connect to broker/signaling error", err);
        });



    }
    static getInstance(): App {
        return new App()
    }
}
/*
    Launch the application
*/
document.addEventListener("DOMContentLoaded", () => {

    window.AudioContext = window.AudioContext || window["webkitAudioContext"];

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
    window["_logger"] = AppDomain.logger // expose logger to window ,

});
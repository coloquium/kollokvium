export class BrowserInfo {
    constructor(public isMobileDevice: boolean, public appName: string, public browserName: string, public userAgent: string, public version: string) {
    }


    static getOS(): string {
        let os = "unknown"
        let expressions = [{
            displayName: 'Chrome OS',
            r: /CrOS/
        }, {
            displayName: 'Windows 10',
            r: /(Windows 10.0|Windows NT 10.0)/
        }, {
            displayName: 'Windows 8.1',
            r: /(Windows 8.1|Windows NT 6.3)/
        }, {
            displayName: 'Windows 8',
            r: /(Windows 8|Windows NT 6.2)/
        }, {
            displayName: 'Windows 7',
            r: /(Windows 7|Windows NT 6.1)/
        }, {
            displayName: 'Android',
            r: /Android/
        }, {
            displayName: 'Linux',
            r: /(Linux|X11)/
        }, {
            displayName: 'iOS',
            r: /(iPhone|iPad|iPod)/
        }, {
            displayName: 'Mac OS X',
            r: /Mac OS X/
        }
        ];
        for (var i = 0, cs; cs = expressions[i]; i++) {
            if (cs.r.test(navigator.userAgent)) {
                os = cs.displayName;
                break;
            }
        }
        return os;
    }


    static getBrowser(): BrowserInfo {
        let version = navigator.appVersion;
        let userAgent = navigator.userAgent;
        const isMobileDevice = !!(/Android|webOS|iPhone|iPad|iPod|BB10|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent || ''));
        const isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);
        const isOpera = !!window["opera"] || navigator.userAgent.indexOf(' OPR/') >= 0;
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1 && ('netscape' in window) && / rv:/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isChrome = !!window["chrome"] && !isOpera;
        let browserName = 'Unkown';
        if (isEdge) {
            browserName = "Edge";
        }
        else if (isOpera) {
            browserName = "Opera";
        }
        else if (isSafari) {
            browserName = "Safari";
            let agent = userAgent;
            let offset = 0;
            if (agent.indexOf('CriOS') !== -1) {
                offset = agent.indexOf('CriOS');
                browserName = 'Chrome';
                version = agent.substring(offset + 6);
            }
            else if (agent.indexOf('FxiOS') !== -1) {
                offset = agent.indexOf('FxiOS');
                browserName = 'Firefox';
                version = agent.substring(offset + 6);
            }
            else {
                offset = agent.indexOf('Safari');
                browserName = 'Safari';
                version = agent.substring(offset + 7);
                if ((offset = agent.indexOf('Version')) !== -1) {
                    version = agent.substring(offset + 8);
                }
                if (navigator.userAgent.indexOf('Version/') !== -1) {
                    version = navigator.userAgent.split('Version/')[1].split(' ')[0];
                }
            }
        }
        else if (isChrome) {
            browserName = "Chrome";
            version = userAgent.substring(userAgent.indexOf('Chrome') + 7);
        }
        else if (isFirefox) {
            browserName = "Firefox";
            version = userAgent.substring(userAgent.indexOf('Firefox') + 8);
        }
        return new BrowserInfo(isMobileDevice, navigator.appName, browserName, userAgent, version);
    }

    static MediaDevices(): Promise<any> {
        return new Promise<any>((resolve, reject) => {

            let audioInputDevices = new Array<any>();
            let audioOutputDevices = new Array<any>();
            let videoInputDevices = new Array<any>();

            navigator.mediaDevices.enumerateDevices().catch(err => {
                reject(err);
            }).then((devices: Array<MediaDeviceInfo>) => {

                videoInputDevices = devices.filter((pre) => {
                    return pre.kind === "videoinput";
                });

                audioInputDevices = devices.filter((pre) => {
                    return pre.kind === "audioinput";
                });

                audioOutputDevices = devices.filter((pre) => {
                    return pre.kind === "audiooutput";
                });

                // });
                resolve({
                    hasWebcam: videoInputDevices.length > 0, hasMicrophone: audioInputDevices.length > 0, hasSpeaker: audioOutputDevices.length > 0,
                    videoDevices: videoInputDevices, audioDevices: audioInputDevices, speakers:
                        audioOutputDevices
                });
            });
        });
    }

}

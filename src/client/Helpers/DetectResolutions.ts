export class DetectResolutions {
    static candidates = [
        {
            "label": "4K(UHD)",
            "width": 3840,
            "height": 2160,
            "ratio": "16:9"
        },
        {
            "label": "1080p(FHD)",
            "width": 1920,
            "height": 1080,
            "ratio": "16:9"
        },
        {
            "label": "UXGA",
            "width": 1600,
            "height": 1200,
            "ratio": "4:3"
        },
        {
            "label": "720p(HD)",
            "width": 1280,
            "height": 720,
            "ratio": "16:9"
        },
        {
            "label": "SVGA",
            "width": 800,
            "height": 600,
            "ratio": "4:3"
        },
        {
            "label": "VGA",
            "width": 640,
            "height": 480,
            "ratio": "4:3"
        },
        {
            "label": "360p(nHD)",
            "width": 640,
            "height": 360,
            "ratio": "16:9"
        },
        {
            "label": "CIF",
            "width": 352,
            "height": 288,
            "ratio": "4:3"
        },
        {
            "label": "QVGA",
            "width": 320,
            "height": 240,
            "ratio": "4:3"
        },
        {
            "label": "QCIF",
            "width": 176,
            "height": 144,
            "ratio": "4:3"
        },
        {
            "label": "QQVGA",
            "width": 160,
            "height": 120,
            "ratio": "4:3"
        }
    ];
    static getCandidate(label: string) {
        let match = this.candidates.find((c) => {
            return c.label === label;
        });
        return match;
    }
    static tryCandidate(deviceId: string, candidate: any, cb: (result: any) => void) {
        let constraints = {
            audio: false,
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { exact: candidate.width },
                height: { exact: candidate.height }
            }
        };
        navigator.mediaDevices.getUserMedia(constraints)
            .then(((mediaStream: MediaStream) => {
                cb(candidate);
            }))
            .catch((error) => {
                console.log('non working candidate', candidate);
            });
    }
    static testResolutions(deviceId: string, cb: (result: any) => void) {
        let c = 0;
        this.candidates.forEach((option: any) => {
            window.setTimeout(() => {
                this.tryCandidate(deviceId, this.candidates[c], cb);
                c++;
            }, 200);
        });
    }
}

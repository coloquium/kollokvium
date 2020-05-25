export class MediaUtils {
    static CheckStream(tracks: Array<MediaStreamTrack>, state:string): boolean {
        return tracks.filter((t: MediaStreamTrack) => { return t.readyState === state; }) ? true : false;
    }

      /**
     * Get this clients media devices
     *
     * @returns {Promise<Array<MediaDeviceInfo>>}
     * @memberof App
     */
    static getMediaDevices(): Promise<Array<MediaDeviceInfo>> {
        return new Promise<Array<MediaDeviceInfo>>((resolve: any, reject: any) => {
            navigator.mediaDevices.enumerateDevices().then((devices: Array<MediaDeviceInfo>) => {
                resolve(devices);
            }).catch(reject);
        });
    };
}

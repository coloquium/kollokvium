import { IE2EE } from "thor-io.client-vnext/src/E2EE/EncodeDecode";

/**
 * Primitive encrypion
 * based on https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/endtoend-encryption/js/main.js
 * @export
 * @class E2EEBase
 * @implements {IE2EE}
 */
export class E2EEBase implements IE2EE {

    private frameTypeToCryptoOffset: any = {
        key: 10,
        delta: 3,
        undefined: 1,
    };
    setKey(key:string){
            this.currentCryptoKey = key;
    }
    useCryptoOffset = true;
    currentKeyIdentifier = 0;
    rcount: number = 0;
    scount: number = 0;

    constructor(public currentCryptoKey: string) {

    }
    dump(encodedFrame: any, direction: any, max = 16) {
        const data = new Uint8Array(encodedFrame.data);
        let bytes = '';
        for (let j = 0; j < data.length && j < max; j++) {
            bytes += (data[j] < 16 ? '0' : '') + data[j].toString(16) + ' ';
        }
        console.log(performance.now().toFixed(2), direction, bytes.trim(),
            'len=' + encodedFrame.data.byteLength,
            'type=' + (encodedFrame.type || 'audio'),
            'ts=' + encodedFrame.timestamp,
            'ssrc=' + encodedFrame.synchronizationSource
        );
    }

    encode(encodedFrame: any, controller: any) {
        if (this.scount++ < 30) { // dump the first 30 packets.
            this.dump(encodedFrame, 'send');
        }
        if (this.currentCryptoKey) {
            const view = new DataView(encodedFrame.data);
            // Any length that is needed can be used for the new buffer.
            const newData = new ArrayBuffer(encodedFrame.data.byteLength + 5);
            const newView = new DataView(newData);

            const cryptoOffset = this.useCryptoOffset ? this.frameTypeToCryptoOffset[encodedFrame.type] : 0;
            for (let i = 0; i < cryptoOffset && i < encodedFrame.data.byteLength; ++i) {
                newView.setInt8(i, view.getInt8(i));
            }
            // This is a bitwise xor of the key with the payload. This is not strong encryption, just a demo.

            for (let i = cryptoOffset; i < encodedFrame.data.byteLength; ++i) {
                const keyByte = this.currentCryptoKey.charCodeAt(i % this.currentCryptoKey.length);
                newView.setInt8(i, view.getInt8(i) ^ keyByte);
            }
            // Append keyIdentifier.
            newView.setUint8(encodedFrame.data.byteLength, this.currentKeyIdentifier % 0xff);
            // Append checksum
            newView.setUint32(encodedFrame.data.byteLength + 1, 0xDEADBEEF);

            encodedFrame.data = newData;
        }
        controller.enqueue(encodedFrame);
    }
    decode(encodedFrame: any, controller: any) {
        if (this.rcount++ < 30) { // dump the first 30 packets
            this.dump(encodedFrame, 'recv');
        }
        const view = new DataView(encodedFrame.data);
        const checksum = encodedFrame.data.byteLength > 4 ? view.getUint32(encodedFrame.data.byteLength - 4) : false;
        if (this.currentCryptoKey) {
            if (checksum !== 0xDEADBEEF) {
                console.log('Corrupted frame received, checksum ' +
                    checksum.toString(16));
                return; // This can happen when the key is set and there is an unencrypted frame in-flight.
            }
            const keyIdentifier = view.getUint8(encodedFrame.data.byteLength - 5);
            if (keyIdentifier !== this.currentKeyIdentifier) {
                console.log(`Key identifier mismatch, got ${keyIdentifier} expected ${this.currentKeyIdentifier}.`);
                return;
            }

            const newData = new ArrayBuffer(encodedFrame.data.byteLength - 5);
            const newView = new DataView(newData);
            const cryptoOffset = this.useCryptoOffset ? this.frameTypeToCryptoOffset[encodedFrame.type] : 0;

            for (let i = 0; i < cryptoOffset; ++i) {
                newView.setInt8(i, view.getInt8(i));
            }
            for (let i = cryptoOffset; i < encodedFrame.data.byteLength - 5; ++i) {
                const keyByte = this.currentCryptoKey.charCodeAt(i % this.currentCryptoKey.length);
                newView.setInt8(i, view.getInt8(i) ^ keyByte);
            }
            encodedFrame.data = newData;
        } else if (checksum === 0xDEADBEEF) {
            return; // encrypted in-flight frame but we already forgot about the key.
        }
        controller.enqueue(encodedFrame);
    }
}



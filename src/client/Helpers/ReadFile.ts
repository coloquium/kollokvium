export class ReadFile {
    static read(f: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let reader = new FileReader();
            reader.onerror = reject;
            reader.onload = (function (tf) {
                return function (e: any) {
                    resolve({ buffer: e.target.result, tf: tf });
                };
            })(f);
            reader.readAsArrayBuffer(f);
        });
    }
    static readChunks(file: any,callback:(buffer:ArrayBuffer,chunkSize:number,isFinal:boolean)=>void) {
        const chunkSize = 16384;
        let fileReader = new FileReader();
        let offset = 0;
        let remains = file.size;
        fileReader.addEventListener('error', error => console.error('Error reading file:', error));
        fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
        fileReader.addEventListener('load', (e: any) => {
            remains -= e.target.result.byteLength;
            callback(e.target.result,e.target.result.byteLength,
                remains === 0);
            offset += e.target.result.byteLength;
            if (offset < file.size) {
                readSlice(offset);
            }
        });
        const readSlice = o => {
            const slice = file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }
}

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
}

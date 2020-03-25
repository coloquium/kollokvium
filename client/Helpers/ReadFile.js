"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ReadFile {
    static read(f) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onerror = reject;
            reader.onload = (function (tf) {
                return function (e) {
                    resolve({ buffer: e.target.result, tf: tf });
                };
            })(f);
            reader.readAsArrayBuffer(f);
        });
    }
}
exports.ReadFile = ReadFile;

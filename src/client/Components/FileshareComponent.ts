import { DataChannel, Utils } from "thor-io.client-vnext";
import { DOMUtils } from "../Helpers/DOMUtils";
import { ReadFile } from "../Helpers/ReadFile";
import { UserSettings } from '../UserSettings';
import { AppComponent } from './AppComponent';

export class FileShareComponent extends AppComponent {

    onFileReceived?:(fileInfo:any) =>void

    constructor(public dataChannel: DataChannel,private userSettings:UserSettings) {
        super();
        dataChannel.On("fileShare", (fileInfo: any, arrayBuffer: ArrayBuffer) => {
            this.render(fileInfo, new Blob([arrayBuffer], {
                type: fileInfo.mimeType
            }));
        });
    }
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
            sender: UserSettings.nickname
        };
        const shareId = Utils.newGuid();
        let bytes = 0;
        ReadFile.readChunks(file, (data, chunkSize, isFinal) => {
            bytes += chunkSize;
            DOMUtils.get(".progress-bar", sendProgress).style.width = `${((chunkSize / meta.size) * 100) * 1000}%`;

            this.dataChannel.InvokeBinary("fileShare", meta, data, isFinal, shareId);
            if (isFinal) {
                setTimeout(() => {
                    DOMUtils.get("#share-file-box").classList.toggle("hide");
                    sendProgress.classList.toggle("hide");
                }, 2000);
            }
        });
    }
    render(fileInfo: any, blob: Blob) {
        if(this.onFileReceived)
                this.onFileReceived(fileInfo); 
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


}
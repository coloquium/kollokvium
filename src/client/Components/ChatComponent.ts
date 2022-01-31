import { DataChannel } from "thor-io.client-vnext";
import { AppDomain } from "../AppDomain";
import { DOMUtils } from "../Helpers/DOMUtils";
import { UserSettings } from '../UserSettings';
import { AppComponent } from './AppComponent';
import { Transcriber } from "../Audio/Transcriber";
export class ChatComponent extends AppComponent {


    onChatMessage: (args: any) => void
    chatMessage?: HTMLInputElement;
    language: string;
    constructor(public dc: DataChannel, public userSettings: UserSettings) {
        super();
        this.language = UserSettings.language;
        this.dc.on("chatMessage", (data: any) => {
            if (this.onChatMessage) this.onChatMessage(data);
            console.log(this.language, data.language);
            this.render(data);
        });

        this.chatMessage = DOMUtils.get<HTMLInputElement>("#chat-message")

        DOMUtils.on("keydown", this.chatMessage, (e) => {
            if (e.keyCode == 13) {
                this.sendMessage(UserSettings.nickname, this.chatMessage.value)
                this.chatMessage.value = "";
            }
        });

    }

    sendMessage(sender: string, message: string) {
        const data = {
            text: message,
            from: sender,
            language: this.language || navigator.languages[0]

        }
        console.log("sending", data)
        this.dc.invoke("chatMessage", data);
        this.render(data);
    }
    render(msg: any) {
        let chatMessages = DOMUtils.get("#chat-messages");
        if (this.language != msg.language) {
            Transcriber.translateCaptions(AppDomain.translateKey, msg.text, msg.language, this.language).then(translate => {
                let translated = DOMUtils.makeLink(translate);
                let template = `<div>
                    <mark>${msg.from}</mark>
                    <time>(${(new Date()).toLocaleTimeString().substring(0, 5)})</time>
                    <span>${translated}<i class="ml-3 text-muted chat-translation">${msg.text}</i></span>
                    </div>`
                chatMessages.prepend(DOMUtils.toDOM(template));
            });
        } else {
            let template = `<div>
                <mark>${msg.from}</mark>
                <time>(${(new Date()).toLocaleTimeString().substring(0, 5)})</time>
                <span>${DOMUtils.makeLink(msg.text)}</span>
                </div>`
            chatMessages.prepend(DOMUtils.toDOM(template));
        }
    }

}
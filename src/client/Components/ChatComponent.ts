import { DataChannel } from "thor-io.client-vnext";
import { DOMUtils } from "../Helpers/DOMUtils";
import { UserSettings } from '../UserSettings';
import { AppComponent } from './AppComponent';

export class ChatComponent extends AppComponent {


        onChatMessage:(args:any) =>void
        chatMessage?: HTMLInputElement;

        constructor(public dc:DataChannel,private userSettings:UserSettings){

            super();

            this.dc.On("chatMessage", (data: any) => {
                if(this.onChatMessage) this.onChatMessage(data);
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
                from: sender
            }
            this.dc.Invoke("chatMessage", data);
            this.render(data);
        }
        render(msg: any) {
            let chatMessages = DOMUtils.get("#chat-messages");
        
            let message = document.createElement("div");
            let sender = document.createElement("mark");
            let time = document.createElement("time");
            time.textContent = `(${(new Date()).toLocaleTimeString().substr(0, 5)})`;
            let messageText = document.createElement("span");
            messageText.innerHTML = DOMUtils.makeLink(msg.text);
        
            sender.textContent = msg.from;
            message.prepend(time);
            message.prepend(sender);
            message.append(messageText);
    
            chatMessages.prepend(message);
          
        }

}
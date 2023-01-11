import { ClientFactory, Controller, DataChannel } from "thor-io.client-vnext";
import { Transcriber } from "../Audio/Transcriber";
import { DOMUtils } from "../Helpers/DOMUtils";

export class JournalComponent {
    data: any[];
    controller: Controller;
    constructor(public clientFactory: ClientFactory, public dc: DataChannel) {
        this.data = new Array<any>();
        this.controller = this.clientFactory.getController("broker") as Controller;

        DOMUtils.on("click", DOMUtils.get("#btn-summarize"), (e) => {
         
            const textToSummarize = this.data.map((p) => {            
                return `${p.sender}:${p.text}`
            }).join("\n");

            Transcriber.textCompletion(`Turn this chat into a summary:\n${textToSummarize}`).then( r => {



                const data = {
                    text: r.choices[0].text,
                    from: "OPENAI",
                    language: "en"
                }
                this.dc.invoke("chatMessage", data);
                this.add("robot","OPENAI", data.text, data.text, "en");
                this.refresh();
            });

       
        });

       

    }
    add(origin:string,sender: string, text: string, originText: string, language: string) {
        this.data.push({
            origin: origin,
            time: new Date().toLocaleTimeString().substr(0, 5),
            sender: sender,
            originText: originText,
            text: text,
            language: language
        });

        this.refresh(); 
    
    }



    download() {
        let result = this.render();

        let data = `
        <html>
        <head>
        <title>Kollokvium meeting journal</title>
        <style>
        p{
            line-height:1.5;
        }
        time,mark{
            margin-right:20px;

        }
        </style>
        </head>
        <body>
        <h1>Kollokvium meeting journal</h1>
        ${result.outerHTML}
        </body>
        </html>
        `;


        let blob = new Blob([data], { type: "text/html" });
        let blobUrl = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${Math.random().toString(36).substring(8)}.html`;
        a.click();


    }

    refresh(): void {

        DOMUtils.get("#journal-content div.journal").remove();
        DOMUtils.get("#journal-content").append(this.render());
    }

    render(): HTMLElement {
        let journal = document.createElement("div");
        journal.classList.add("journal");
        this.data.forEach((entry: any) => {
            let line = document.createElement("p");
            let time = document.createElement("time");
            time.textContent = entry.time;
            line.append(time);
            let sender = document.createElement("mark");
            sender.textContent = entry.sender;
            line.append(sender);

            let origin = document.createElement("i");
          
            origin.classList.add("fas");
            origin.classList.add(`fa-${entry.origin}`)
            origin.classList.add("mx-2");

            line.append(origin);

            let text = document.createElement("span");
            text.textContent = DOMUtils.linkify(`${entry.text}`);
            line.append(text);
            if (entry.originText.length > 0) {
                let origin = document.createElement("em");
                origin.classList.add("mx-2")
                line.append(origin);
            }
            journal.append(line);
        });
        return journal;
    }
}

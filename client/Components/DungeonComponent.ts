import { AppParticipant } from '../AppParticipant';
import { AppComponent } from './AppComponent';
export class DungeonComponent extends AppComponent {
    isActive: boolean;
    participants: Array<AppParticipant>;
    audio: HTMLAudioElement
    constructor(public id: string) {
        super();
        this.audio = document.createElement("audio") as HTMLAudioElement;
        this.participants = new Array<AppParticipant>();
    }

    removeParticipant(id:string)  {
        let index = this.participants.findIndex((p: AppParticipant) => {
            return p.id == id;
        });
        this.participants.splice(index, 1);
        // remove from ui;
        document.querySelector("li#d-" +id).remove();
        
    }

    addDungeonParticipant(participant: AppParticipant): void {
        if (!participant) throw "cannot add participant"
        let match = this.participants.find((p: AppParticipant) => {
            return p.id == participant.id;
        });
        if (!match) {
            this.participants.push(participant);
            console.log(`added a participant to dungeon ${this.id}`, participant);
            this.addCanvas(participant);
            
        }
    
    }
    // dungeonParticipant(id: string): void {
    //     let index = this.participants.findIndex((p) => {
    //         return p.id == this.id;
    //     });
    //     this.participants.splice(index, 1);
    // }
    setState(state: boolean) {
        this.isActive = state;
    }

    private addCanvas(p:AppParticipant):void{
        let li = document.createElement("li");
               li.id = "d-" +p.id;
            p.captureImage().then((i: ImageBitmap) => {
                let canvas = document.createElement("canvas");
                canvas.id = "d" +p.id;

                canvas.height = i.height; canvas.width = i.width;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(i, 0, 0, i.width, i.height);
                canvas.dataset.peerId = p.id;
                
                li.append(canvas);
                document.querySelector("#dungeon-"+ this.id + " ul").append(li);                

            
        }).catch(console.error)
    
    }

    destroy(cb:(a:Array<string>)=>void) {
        
        let peers = this.participants.map( (p:AppParticipant) => {
            return p.id;
        });

        cb(peers);


    }

    render(el: HTMLElement): void {
        let html = `
        <div class="dungeon" id="dungeon-${this.id}">
        <div class="dungeon-header">
        Dungeon ${this.id}
        <i class="fas fa-sign-out-alt"></i>
       
         </div>
        <div class="dungeon">
        <ul class="dungeon-thumbs">     
        </ul>
         </div>
         </div>
         `;
        el.appendChild(AppComponent.toDOM(html));
    };


}

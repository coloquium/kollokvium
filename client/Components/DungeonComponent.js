"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppComponent_1 = require("./AppComponent");
class DungeonComponent extends AppComponent_1.AppComponent {
    constructor(id) {
        super();
        this.id = id;
        this.audio = document.createElement("audio");
        this.participants = new Array();
    }
    removeParticipant(id) {
        let index = this.participants.findIndex((p) => {
            return p.id == id;
        });
        this.participants.splice(index, 1);
        // remove from ui;
        document.querySelector("li#d-" + id).remove();
    }
    addDungeonParticipant(participant) {
        if (!participant)
            throw "cannot add participant";
        let match = this.participants.find((p) => {
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
    setState(state) {
        this.isActive = state;
    }
    addCanvas(p) {
        let li = document.createElement("li");
        li.id = "d-" + p.id;
        p.captureImage().then((i) => {
            let canvas = document.createElement("canvas");
            canvas.id = "d" + p.id;
            canvas.height = i.height;
            canvas.width = i.width;
            let ctx = canvas.getContext("2d");
            ctx.drawImage(i, 0, 0, i.width, i.height);
            canvas.dataset.peerId = p.id;
            li.append(canvas);
            document.querySelector("#dungeon-" + this.id + " ul").append(li);
        }).catch(console.error);
    }
    destroy(cb) {
        let peers = this.participants.map((p) => {
            return p.id;
        });
        cb(peers);
    }
    render(el) {
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
        el.appendChild(AppComponent_1.AppComponent.toDOM(html));
    }
    ;
}
exports.DungeonComponent = DungeonComponent;

import { AppParticipant } from '../AppParticipant';
import { AppComponent } from './AppComponent';
export class DungeonComponent extends AppComponent {
    isActive: boolean;
    participants: Array<AppParticipant>;
    constructor(public id: string) {
        super();
        this.participants = new Array<AppParticipant>();
    }
    addDungeonParticipant(p: AppParticipant): void {
        this.participants.push(p);
    }
    dungeonParticipant(id: string): void {
        let index = this.participants.findIndex((p) => {
            return p.id == this.id;
        });
        this.participants.splice(index, 1);
    }
    setState(state: boolean) {
        this.isActive = state;
    }
}

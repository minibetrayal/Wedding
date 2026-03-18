import { Invitee } from './Invitee';

export class Invite {
    id: string;
    name: string;
    numAdditional: number = 0;
    invitees: Invitee[];

    phone?: string;
    email?: string;
    notes?: string;
    responded: boolean = false;
    seen: boolean = false;
    additionalInvitees: Invitee[] = [];

    constructor(id: string, name: string, numAdditional: number, invitees: Invitee[]) {
        this.id = id;
        this.name = name;
        this.numAdditional = numAdditional;
        this.invitees = invitees;
    }
}

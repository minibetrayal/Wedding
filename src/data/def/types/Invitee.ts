export class Invitee {
    id: string;
    name: string;
    attending?: boolean;
    dietaryRestrictions?: string;

    constructor(id: string, name: string, attending?: boolean, dietaryRestrictions?: string) {
        this.id = id;
        this.name = name;
        this.attending = attending;
        this.dietaryRestrictions = dietaryRestrictions;
    }
}

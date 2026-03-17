export class Invitee {
    name: string;
    attending?: boolean;
    dietaryRestrictions?: string;

    constructor(name: string, dietaryRestrictions?: string) {
        this.name = name;
        this.dietaryRestrictions = dietaryRestrictions;
    }
}
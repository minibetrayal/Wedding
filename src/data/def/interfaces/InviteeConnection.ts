import { Invitee } from "../types/Invitee";


export interface InviteeConnection {
    get(inviteeId: string): Promise<Invitee>;
    getAll(): Promise<Invitee[]>;
    create(name: string, attending?: boolean, dietaryRestrictions?: string): Promise<Invitee>;
    delete(inviteeId: string): Promise<void>;
    update(inviteeId: string, name: string, attending?: boolean, dietaryRestrictions?: string): Promise<void>;
}
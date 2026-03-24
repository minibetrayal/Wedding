import { Invite } from "../types/Invite";
import { Invitee } from "../types/Invitee";

export interface InviteConnection {
    get(inviteId: string): Promise<Invite>;
    getAll(): Promise<Invite[]>;
    create(name: string, invitees: Invitee[]): Promise<Invite>;
    delete(inviteId: string): Promise<void>;
    update(inviteId: string, phone?: string, email?: string, notes?: string, carpoolRequested?: boolean, carpoolSpotsOffered?: number): Promise<void>;
    updateInvite(inviteId: string, name: string, invitees: Invitee[]): Promise<void>
    updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void>;
}
import { Invite } from './types/Invite';
import { Author } from './types/Author';
import { GuestbookEntry } from './types/GuestbookEntry';
import { Settings } from './types/Settings';
import { Invitee } from './types/Invitee';
import { Photo } from './types/Photo';

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

class TempStore {
    invites: Invite[] = [];
    authors: Author[] = [];
    guestbook: GuestbookEntry[] = [];
    settings: Settings = new Settings();
    // todo: photos: Photo[] = [];

    private created: Set<string> = new Set();
    createSimpleId(): string {
        // does not need to be cryptographically secure
        const length = 6;
        const chars = alpha.split('');
        let id: string;
        do {
            id = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } while (this.created.has(id));
        this.created.add(id);
        return id;
    }

    createUuid() : string {
        return crypto.randomUUID();
    }
}

const tempStore = new TempStore();

class InviteConnection {
    
    async get(inviteId: string): Promise<Invite> {
        const invite = tempStore.invites.find(invite => invite.id === inviteId);
        if (!invite) throw new Error('Invite not found');
        return invite;
    }

    async getAll(): Promise<Invite[]> {
        return tempStore.invites;
    }

    async create(name: string, numAdditional: number, invitees: Invitee[]): Promise<Invite> {
        const invite = new Invite(tempStore.createSimpleId(), name, numAdditional, invitees);
        tempStore.invites.push(invite);
        return invite;
    }

    async delete(inviteId: string): Promise<void> {
        tempStore.invites = tempStore.invites.filter(invite => invite.id !== inviteId);
    }

    // updates that come from the invitee themselves
    async update(inviteId: string, additionalInvitees: Invitee[], phone?: string, email?: string, notes?: string): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new Error('Invite not found');
        if (additionalInvitees.length > existingInvite.numAdditional) {
            throw new Error('Number of invitees exceeds number of additional invitees');
        }
        existingInvite.phone = phone;
        existingInvite.email = email;
        existingInvite.notes = notes;
        existingInvite.additionalInvitees = additionalInvitees;
    }

    // updates that come from the admin to change the invite itself
    async updateInvite(inviteId: string, name: string, numAdditional: number, invitees: Invitee[]): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new Error('Invite not found');
        if (numAdditional < existingInvite.additionalInvitees.length) {
            throw new Error('Number of additional invitees cannot be less than the number of additional invitees');
        }
        existingInvite.name = name;
        existingInvite.numAdditional = numAdditional;
        existingInvite.invitees = invitees;
    }

    // status update
    async updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new Error('Invite not found');
        existingInvite.seen = seen;
        existingInvite.responded = responded;
    }
}

class AuthorConnection {
    async get(authorId: string): Promise<Author> {
        const author = tempStore.authors.find(author => author.id === authorId);
        if (!author) throw new Error('Author not found');
        return author;
    }

    async create(): Promise<Author> {
        const author = new Author(tempStore.createUuid());
        tempStore.authors.push(author);
        return author;
    }
}

class GuestbookConnection {
    async get(entryId: string): Promise<GuestbookEntry> {
        const entry = tempStore.guestbook.find(entry => entry.id === entryId);
        if (!entry) throw new Error('Entry not found');
        return entry;
    }

    async getAll(): Promise<GuestbookEntry[]> {
        return tempStore.guestbook;
    }
    
    async create(author: Author, visible: boolean, content: string, displayName?: string, photo?: Photo): Promise<GuestbookEntry> {
        const entry = new GuestbookEntry(tempStore.createUuid(), author, visible, content, displayName, photo);
        tempStore.guestbook.push(entry);
        return entry;
    }

    async delete(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new Error('Entry not found');
        tempStore.guestbook = tempStore.guestbook.filter(e => e.id !== entryId);
    }
    
    async update(entryId: string, visible: boolean, content: string, displayName?: string, photo?: Photo): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new Error('Entry not found');
        entry.visible = visible;
        entry.content = content;
        entry.updated = new Date();
        entry.displayName = displayName;
        entry.photo = photo;
    }

    async hide(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new Error('Entry not found');
        entry.hidden = true;
        entry.updated = new Date();
    }

    async show(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new Error('Entry not found');
        entry.hidden = false;
        entry.updated = new Date();
    }

}

class SettingsConnection {
    async get<K extends keyof Settings>(setting: K): Promise<Settings[K]> {
        return tempStore.settings[setting];
    }

    async update<K extends keyof Settings>(setting: K, value: Settings[K]): Promise<void> {
        tempStore.settings[setting] = value;
    }
}

class DatabaseConnection {
    invites = new InviteConnection();
    authors = new AuthorConnection();
    guestbook = new GuestbookConnection();
    settings = new SettingsConnection();
}

module.exports = new DatabaseConnection();
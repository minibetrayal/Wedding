import fs from 'fs';
import path from 'path';

import { Invite } from './types/Invite';
import { Author } from './types/Author';
import { GuestbookEntry } from './types/GuestbookEntry';
import { Settings } from './types/Settings';
import { Invitee } from './types/Invitee';
import { Photo } from './types/Photo';

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const photosDir = path.join(process.cwd(), 'photos');

class TempStore {
    invites: Invite[] = [];
    authors: Author[] = [];
    guestbook: GuestbookEntry[] = [];
    settings: Settings = new Settings();
    photos: Photo[] = [];
    invitees: Invitee[] = [];

    private created: Set<string> = new Set();

    createSimpleId(): string {
        const length = 6;
        const chars = alpha.split('');
        let id: string;
        do {
            id = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } while (this.created.has(id));
        this.created.add(id);
        return id;
    }

    createUuid(): string {
        return crypto.randomUUID();
    }
}

const tempStore = new TempStore();

class InviteConnection {
    async get(inviteId: string): Promise<Invite> {
        const invite = tempStore.invites.find(inv => inv.id === inviteId);
        if (!invite) throw new DbNotFoundError('Invite');
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
        tempStore.invites = tempStore.invites.filter(inv => inv.id !== inviteId);
    }

    async update(
        inviteId: string,
        additionalInvitees: Invitee[],
        phone?: string,
        email?: string,
        notes?: string
    ): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        if (additionalInvitees.length > existingInvite.numAdditional) {
            throw new DbError('Number of invitees exceeds number of additional invitees');
        }
        existingInvite.phone = phone;
        existingInvite.email = email;
        existingInvite.notes = notes;
        existingInvite.additionalInvitees = additionalInvitees;
    }

    async updateInvite(
        inviteId: string,
        name: string,
        numAdditional: number,
        invitees: Invitee[]
    ): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        if (numAdditional < existingInvite.additionalInvitees.length) {
            throw new DbError(
                'Number of additional invitees cannot be less than the number of additional invitees'
            );
        }
        existingInvite.name = name;
        existingInvite.numAdditional = numAdditional;
        existingInvite.invitees = invitees;
    }

    async updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.seen = seen;
        existingInvite.responded = responded;
    }
}

class AuthorConnection {
    async get(authorId: string): Promise<Author> {
        const author = tempStore.authors.find(a => a.id === authorId);
        if (!author) throw new DbNotFoundError('Author');
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
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        return entry;
    }

    async getAll(): Promise<GuestbookEntry[]> {
        return tempStore.guestbook;
    }

    async create(
        author: Author,
        visible: boolean,
        content: string,
        displayName?: string,
        photo?: Photo
    ): Promise<GuestbookEntry> {
        const entry = new GuestbookEntry(
            tempStore.createUuid(),
            author,
            visible,
            content,
            displayName,
            photo
        );
        tempStore.guestbook.push(entry);
        return entry;
    }

    async delete(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        tempStore.guestbook = tempStore.guestbook.filter(e => e.id !== entryId);
    }

    async update(
        entryId: string,
        visible: boolean,
        content: string,
        displayName?: string,
        photo?: Photo
    ): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.visible = visible;
        entry.content = content;
        entry.updated = new Date();
        entry.displayName = displayName;
        entry.photo = photo;
    }

    async hide(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.hidden = true;
        entry.updated = new Date();
    }

    async show(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.hidden = false;
        entry.updated = new Date();
    }
}

class PhotoConnection {
    async get(photoId: string): Promise<Photo> {
        const photo = tempStore.photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        return photo;
    }

    async getAll(): Promise<Photo[]> {
        return tempStore.photos;
    }

    async getPhoto(photoId: string): Promise<Buffer> {
        const photo = tempStore.photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        const filePath = path.join(photosDir, photo.id);
        return await fs.promises.readFile(filePath);
    }

    async create(name: string, mimeType: string, data: Buffer): Promise<Photo> {
        const photo = new Photo(tempStore.createUuid(), name,mimeType);
        tempStore.photos.push(photo);

        await fs.promises.mkdir(photosDir, { recursive: true });
        const filePath = path.join(photosDir, photo.id);
        await fs.promises.writeFile(filePath, data);
        return photo;
    }

    async delete(photoId: string): Promise<void> {
        const photo = tempStore.photos.find(p => p.id === photoId);
        tempStore.photos = tempStore.photos.filter(p => p.id !== photoId);
        if (photo) {
            const filePath = path.join(photosDir, photo.id);
            await fs.promises.unlink(filePath).catch(() => { /* ignore if file missing */ });
        }
    }

    async update(photoId: string, name: string, mimeType: string, data?: Buffer): Promise<void> {
        const photoFile = tempStore.photos.find(p => p.id === photoId);
        if (!photoFile) throw new DbNotFoundError('Photo');
        const photo = new Photo(photoFile.id, name, mimeType);
        tempStore.photos = tempStore.photos.map(p => p.id === photoId ? photo : p);

        if (data) {
            await fs.promises.mkdir(photosDir, { recursive: true });
            const filePath = path.join(photosDir, photo.id);
            await fs.promises.writeFile(filePath, data);
        }
    }
}

class InviteeConnection {
    async get(inviteeId: string): Promise<Invitee> {
        const invitee = tempStore.invitees.find(i => i.id === inviteeId);
        if (!invitee) throw new DbNotFoundError('Invitee');
        return invitee;
    }

    async getAll(): Promise<Invitee[]> {
        return tempStore.invitees;
    }

    async create(name: string, dietaryRestrictions?: string): Promise<Invitee> {
        const invitee = new Invitee(tempStore.createUuid(), name, dietaryRestrictions);
        tempStore.invitees.push(invitee);
        return invitee;
    }

    async delete(inviteeId: string): Promise<void> {
        tempStore.invitees = tempStore.invitees.filter(i => i.id !== inviteeId);
    }
    
    async update(inviteeId: string, name: string, dietaryRestrictions?: string): Promise<void> {
        const invitee = tempStore.invitees.find(i => i.id === inviteeId);
        if (!invitee) throw new DbNotFoundError('Invitee');
        invitee.name = name;
        invitee.dietaryRestrictions = dietaryRestrictions;
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
    photos = new PhotoConnection();
    invitees = new InviteeConnection();
}

export default new DatabaseConnection();
export class DbNotFoundError extends Error {
    constructor(itemType: string) {
        super(`${itemType} not found`);
        this.name = 'DbNotFoundError';
    }
}
export class DbError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DbError';
    }
}

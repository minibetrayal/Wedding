import fs from 'fs';
import path from 'path';

import { Invite } from './types/Invite';
import { Author } from './types/Author';
import { GuestbookEntry } from './types/GuestbookEntry';
import { Settings } from './types/Settings';
import { Invitee } from './types/Invitee';
import { Photo } from './types/Photo';

const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
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

    async create(name: string, invitees: Invitee[]): Promise<Invite> {
        const invite = new Invite(tempStore.createSimpleId(), name, invitees);
        tempStore.invites.push(invite);
        return invite;
    }

    async delete(inviteId: string): Promise<void> {
        const before = tempStore.invites.length;
        tempStore.invites = tempStore.invites.filter(inv => inv.id !== inviteId);
        if (tempStore.invites.length === before) throw new DbNotFoundError('Invite');
    }

    async update(
        inviteId: string,
        phone?: string,
        email?: string,
        notes?: string
    ): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.phone = phone;
        existingInvite.email = email;
        existingInvite.notes = notes;
    }

    async updateInvite(
        inviteId: string,
        name: string,
        invitees: Invitee[]
    ): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.name = name;
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

    async create(name: string, attending?: boolean, dietaryRestrictions?: string): Promise<Invitee> {
        const invitee = new Invitee(tempStore.createUuid(), name, attending, dietaryRestrictions);
        tempStore.invitees.push(invitee);
        return invitee;
    }

    async delete(inviteeId: string): Promise<void> {
        tempStore.invitees = tempStore.invitees.filter(i => i.id !== inviteeId);
    }
    
    async update(inviteeId: string, name: string, attending?: boolean, dietaryRestrictions?: string): Promise<void> {
        const invitee = tempStore.invitees.find(i => i.id === inviteeId);
        if (!invitee) throw new DbNotFoundError('Invitee');
        invitee.name = name;
        invitee.attending = attending;
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

    private isInitialized = false;
    /** Ensures only one init runs if many handlers call `database()` at once */
    private initPromise: Promise<this> | null = null;

    async init(): Promise<this> {
        if (this.isInitialized) return this;
        if (!this.initPromise) {
            this.initPromise = (async () => {
                try {
                    const dummyData = new DummyData();
                    await dummyData.createInvites(this);
                    await dummyData.createGuestbookEntries(this);
                    this.isInitialized = true;
                    return this;
                } catch (err) {
                    this.initPromise = null;
                    throw err;
                }
            })();
        }
        return this.initPromise;
    }
}

export const database = new DatabaseConnection();

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


class DummyData {
    private readonly inviteSeeds: Array<{
        name: string;
        guests: Array<{
            name: string;
            attending?: boolean;
            dietaryRestrictions?: string;
        }>;
        seen?: boolean;
        responded?: boolean;
        notes?: string;
        phone?: string;
        email?: string;
    }> = [
        {
            name: 'Alex & Jordan',
            guests: [
                { name: 'Alex', attending: true, dietaryRestrictions: 'Vegetarian — no fish, please.' },
                { name: 'Jordan', attending: false },
            ],
            seen: true,
            responded: true,
        },
        {
            name: 'The Chen family',
            guests: [
                { name: 'Pat', attending: false },
                { name: 'Kim', attending: false },
                { name: 'Lee', attending: false },
            ],
            seen: true,
            responded: true,
        },
        {
            name: 'Sam Taylor',
            guests: [{ name: 'Sam' }],
            seen: true,
            notes: 'So excited — let us know if you need anything from us!',
        },
        {
            name: 'Morgan Lee + guest',
            guests: [{ name: 'Morgan' }, { name: 'Plus-one' }],
            seen: true,
            notes: 'Plus-one’s full name to follow; they’ll share dietary needs once confirmed.',
        },
        {
            name: 'Priya & Dev',
            guests: [
                { name: 'Priya', attending: true, dietaryRestrictions: 'Vegan.' },
                { name: 'Dev', attending: true },
                { name: 'Asha', attending: true, dietaryRestrictions: 'Severe peanut allergy — carries epinephrine.' },
            ],
            seen: true,
            responded: true,
        },
        {
            name: 'The Okafor family',
            guests: [
                { name: 'Chioma', attending: true },
                { name: 'David', attending: true, dietaryRestrictions: 'Diabetic — low-sugar dessert appreciated if possible.' },
                { name: 'Zara', attending: false },
            ],
            seen: true,
            responded: true,
            notes: 'Please let us know if a kids’ meal option is available.',
        },
        {
            name: 'Elena Vasquez',
            guests: [{ name: 'Elena', attending: true, dietaryRestrictions: 'Halal preferred where possible.' }],
            seen: true,
            responded: true,
        },
        {
            name: 'Ben Carter',
            guests: [{ name: 'Ben', attending: true }],
            seen: true,
            responded: true,
            notes: 'Flying in that morning — may be ceremony-only if the flight is delayed.',
        },
        {
            name: 'River & Jamie',
            guests: [
                { name: 'River', attending: true, dietaryRestrictions: 'Coeliac — strictly gluten free, cross-contamination matters.' },
                { name: 'Jamie', attending: true },
            ],
            seen: true,
            responded: true,
            notes: 'One of us is GF (River); Jamie has no restrictions.',
        },
        {
            name: 'Uncle Theo',
            guests: [{ name: 'Theo' }],
        },
    ];

    private readonly guestbookSeeds: Array<{
        displayName?: string;
        content: string;
        visible: boolean;
        daysAgo: number;
    }> = [
        {
            displayName: 'The Chen family',
            content:
                'We are so happy for you both! Thank you for letting us share in your day — we cannot wait to celebrate on the island.',
            visible: true,
            daysAgo: 2,
        },
        {
            displayName: 'Sam T.',
            content: 'Still smiling from the save-the-date. Counting down!',
            visible: true,
            daysAgo: 5,
        },
        {
            displayName: 'Priya',
            content:
                'Wishing you a lifetime of laughter and good food. The little ones are already practising their dance moves.',
            visible: true,
            daysAgo: 8,
        },
        {
            content:
                'From everyone at the office — congratulations! We will raise a glass to you on the big day.',
            visible: true,
            daysAgo: 11,
        },
        {
            displayName: 'River',
            content:
                'Thank you for thinking of every detail for guests with dietary needs. It means more than you know.',
            visible: true,
            daysAgo: 14,
        },
        {
            displayName: 'Uncle Theo',
            content: 'Would not miss it. See you there.',
            visible: true,
            daysAgo: 18,
        },
        {
            displayName: 'Morgan & guest',
            content:
                'So excited to watch you two tie the knot. Here is to sunshine, good music, and an unforgettable weekend.',
            visible: true,
            daysAgo: 21,
        },
    ];

    async createInvites(db: DatabaseConnection) {
        for (const row of this.inviteSeeds) {
            const invitees: Invitee[] = [];
            for (const g of row.guests) {
                invitees.push(
                    await db.invitees.create(g.name, g.attending, g.dietaryRestrictions)
                );
            }
            const invite = await db.invites.create(row.name, invitees);
            await db.invites.updateStatus(invite.id, 
                row.seen !== undefined ? row.seen : false, 
                row.responded !== undefined ? row.responded : false);
            await db.invites.update(invite.id, row.notes, row.phone, row.email);
        }
    }

    async createGuestbookEntries(db: DatabaseConnection) {
        for (const row of this.guestbookSeeds) {
            const author = await db.authors.create();
            const entry = await db.guestbook.create(
                author,
                row.visible,
                row.content,
                row.displayName
            );
            const created = new Date();
            created.setDate(created.getDate() - row.daysAgo);
            entry.created = created;
            entry.updated = created;
        }
    }
}
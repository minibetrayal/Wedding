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
    /** Set in development only; used by `GET /guestbook/__dev/fixture-author`. */
    guestbookDevFixtureAuthorId?: string;

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
        notes?: string,
        carpoolRequested?: boolean,
        carpoolSpotsOffered?: number
    ): Promise<void> {
        const existingInvite = tempStore.invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.phone = phone;
        existingInvite.email = email;
        existingInvite.notes = notes;
        if (carpoolRequested !== undefined) existingInvite.carpoolRequested = carpoolRequested;
        if (carpoolSpotsOffered !== undefined) existingInvite.carpoolSpotsOffered = carpoolSpotsOffered;
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

    async getAll(): Promise<Author[]> {
        return tempStore.authors;
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

    async count(): Promise<number> {
        return tempStore.guestbook.length;
    }

    async create(
        author: Author,
        visible: boolean,
        content?: string,
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
        tempStore.guestbook.unshift(entry);
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
        content?: string,
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
        entry.pendingRemoderation = entry.moderated;
    }

    /**
     * Hide from the public guestbook.
     * @param automoderated When true, leave `pendingRemoderation` set so the post appears in the moderation queue; when false/omitted, clear it (admin confirmed removal).
     */
    async hide(entryId: string, moderationReason?: string, automoderated?: boolean): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.moderated = true;
        const trimmed = moderationReason?.trim();
        entry.moderationReason = trimmed && trimmed.length > 0 ? trimmed : undefined;
        entry.updated = new Date();
        entry.pendingRemoderation = automoderated === true;
    }

    async show(entryId: string): Promise<void> {
        const entry = tempStore.guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.moderated = false;
        entry.moderationReason = undefined;
        entry.pendingRemoderation = false;
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
        const filePath = path.join(photosDir, photo.filename());
        return await fs.promises.readFile(filePath);
    }

    async create(name: string, mimeType: string, data: Buffer): Promise<Photo> {
        const photo = new Photo(tempStore.createUuid(), name, mimeType);
        tempStore.photos.push(photo);

        await fs.promises.mkdir(photosDir, { recursive: true });
        const filePath = path.join(photosDir, photo.filename());
        await fs.promises.writeFile(filePath, data);
        return photo;
    }

    async delete(photoId: string): Promise<void> {
        const photo = tempStore.photos.find(p => p.id === photoId);
        tempStore.photos = tempStore.photos.filter(p => p.id !== photoId);
        if (photo) {
            const filePath = path.join(photosDir, photo.filename());
            await fs.promises.unlink(filePath).catch(() => { /* ignore if file missing */ });
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
                    await fs.promises.rm(photosDir, { recursive: true, force: true });
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

    /** Development: author id with fixture posts for guestbook list states (see guestbook dev route). */
    getGuestbookDevFixtureAuthorId(): string | undefined {
        return tempStore.guestbookDevFixtureAuthorId;
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
    /** Dev-only sample images; contents are discovered at runtime. */
    private static readonly dummyPhotosSourceDir = path.join(process.cwd(), 'dummy-photos');
    private static readonly dummyPhotoFilenameRe = /\.(jpe?g|png|gif|webp)$/i;

    private static async listSortedDummyPhotoPaths(): Promise<string[]> {
        try {
            const entries = await fs.promises.readdir(DummyData.dummyPhotosSourceDir, {
                withFileTypes: true,
            });
            return entries
                .filter((e) => e.isFile() && DummyData.dummyPhotoFilenameRe.test(e.name))
                .map((e) => path.join(DummyData.dummyPhotosSourceDir, e.name))
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        } catch {
            return [];
        }
    }

    private static imageMimeTypeForPath(filePath: string): string {
        switch (path.extname(filePath).toLowerCase()) {
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            default:
                return 'image/jpeg';
        }
    }

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
        carpoolRequested?: boolean;
        carpoolSpotsOffered?: number;
    }> = [
        {
            name: 'Alex & Jordan',
            guests: [
                { name: 'Alex', attending: true, dietaryRestrictions: 'Vegetarian — no fish, please.' },
                { name: 'Jordan', attending: false },
            ],
            seen: true,
            responded: true,
            carpoolRequested: true,
            carpoolSpotsOffered: 0,
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
            carpoolRequested: true,
            carpoolSpotsOffered: 0,
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
            carpoolRequested: true,
            carpoolSpotsOffered: 0,
        },
        {
            name: 'Elena Vasquez',
            guests: [{ name: 'Elena', attending: true, dietaryRestrictions: 'Halal preferred where possible.' }],
            seen: true,
            responded: true,
            carpoolRequested: false,
            carpoolSpotsOffered: 2,
        },
        {
            name: 'Ben Carter',
            guests: [{ name: 'Ben', attending: true }],
            seen: true,
            responded: true,
            notes: 'Flying in that morning — may be ceremony-only if the flight is delayed.',
            carpoolRequested: true,
            carpoolSpotsOffered: 0,
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
            carpoolRequested: false,
            carpoolSpotsOffered: 3,
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
        /** If true and `dummy-photos` has image files, attach the next one (round-robin). */
        attachDummyPhoto?: boolean;
    }> = [
        {
            displayName: 'The Chen family',
            content:
                'We are so happy for you both, and we have been trying to find the right words since the invitation arrived. Your kindness over the years has meant the world to our whole family. From the late-night group chats planning this weekend to the hundred tiny details you have thought of for every guest, it shows how much heart you put into everything. We cannot wait to watch you walk down the aisle, share a meal under the lights, and embarrass ourselves on the dance floor in your honour. Thank you for letting us be part of it. With love from everyone at our table — we are counting the sleeps.',
            visible: true,
            daysAgo: 2,
        },
        {
            displayName: 'Sam T.',
            content:
                'Still smiling from the save-the-date — honestly, I have it pinned above my desk and every colleague who walks past asks about it. Counting down feels inadequate; I have a spreadsheet of outfits, a playlist called “pre-wedding hype,” and a group chat that will not stop sending heart emojis. You two have been the steady centre of our friend group for so long that seeing you make it official is going to wreck me in the best way. I promise to behave during the ceremony and make up for it on the dance floor. Cannot wait to raise a glass, ugly-cry during the vows, and tell embarrassing stories only half of which are true.',
            visible: true,
            daysAgo: 5,
            attachDummyPhoto: true,
        },
        {
            displayName: 'Priya',
            content:
                'Wishing you a lifetime of laughter and good food. The little ones are already practising their dance moves.',
            visible: true,
            daysAgo: 8,
            attachDummyPhoto: true,
        },
        {
            content:
                'From everyone at the office — congratulations! We will raise a glass to you on the big day. The kitchen whiteboard is already covered in doodled hearts and someone printed your save-the-date for the notice board (sorry if that is weird; we are invested). Half of us only met you through work retreats and somehow you still invited us like family. We have pooled for a gift, argued politely about wrapping paper, and scheduled the group photo for the reception whether you like it or not. Wishing you calm inboxes until then, zero spreadsheet errors, and a honeymoon where nobody asks you to “jump on a quick call.”',
            visible: true,
            daysAgo: 11,
            attachDummyPhoto: true,
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
            attachDummyPhoto: true,
        },
        {
            displayName: 'Alex & Jordan',
            content:
                'From your first RSVP to this — we are cheering for you both every step of the way. We still remember the night you told us in that cramped booth at the diner, napkins everywhere, laughing so hard the waiter asked if we needed water. Cannot wait to dance badly together, hold your jackets during photos, and be the ones who remember where you left your phones. You have built something rare: a partnership that is kind in public and honest in private. We are proud of you, grateful to know you, and already arguing over who cries first when the music starts.',
            visible: true,
            daysAgo: 3,
        },
        {
            displayName: 'Chioma',
            content: 'Thank you for making the weekend so easy for families. The kids are already asking about the cake.',
            visible: true,
            daysAgo: 4,
        },
        {
            content: 'A little note from the neighbours — we will water your plants while you are away. Congratulations!',
            visible: true,
            daysAgo: 6,
        },
        {
            displayName: 'David O.',
            content: 'Honoured to be invited. Looking forward to the ceremony and whatever chaos the dance floor brings.',
            visible: true,
            daysAgo: 7,
        },
        {
            displayName: 'Elena',
            content: 'Your love for detail shows in every update you send. Wishing you calm nerves and blue skies.',
            visible: true,
            daysAgo: 9,
        },
        {
            displayName: 'Jamie',
            content: 'River says hi too — we are practising our “congratulations” faces for photos. See you soon!',
            visible: true,
            daysAgo: 10,
        },
        {
            displayName: 'Kim Chen',
            content: 'Pat and Lee send love as well. This is going to be beautiful.',
            visible: true,
            daysAgo: 12,
        },
        {
            displayName: 'Dev',
            content: 'Priya told me to keep this short: we are thrilled. Also she says the playlist better have bangers.',
            visible: true,
            daysAgo: 13,
        },
        {
            displayName: 'Zara',
            content: 'I will be the one hyping everyone up at the reception. Fair warning.',
            visible: true,
            daysAgo: 15,
        },
        {
            content: 'Your uni friends (you know who we are) — still cannot believe it. In the best way. Much love.',
            visible: true,
            daysAgo: 16,
        },
        {
            displayName: 'Asha',
            content: 'Thank you for the clear allergy info on the site. Makes parents breathe easier. See you there!',
            visible: true,
            daysAgo: 17,
        },
        {
            displayName: 'Ben’s mum',
            content: 'Proud of you both from afar. We will be watching the clock that day and smiling.',
            visible: true,
            daysAgo: 19,
        },
        {
            displayName: 'Lee',
            content: 'Third Chen here — honestly just here for the food and the vows. Mostly the vows.',
            visible: true,
            daysAgo: 20,
        },
        {
            displayName: 'Sam’s partner',
            content: 'Sam made me write something heartfelt. So: you two deserve every good thing. There.',
            visible: true,
            daysAgo: 22,
        },
        {
            displayName: 'Florist team',
            content: '(Pretend this is not us testing the guestbook.) The flowers are going to be stunning. — J.',
            visible: true,
            daysAgo: 23,
        },
        {
            content: 'To the couple: thank you for choosing a weekend we could all make work. Grateful.',
            visible: true,
            daysAgo: 24,
        },
        {
            displayName: 'Morgan',
            content: 'Plus-one says they are in. Formal name incoming — promise we are not holding you hostage with spreadsheets.',
            visible: true,
            daysAgo: 25,
        },
        {
            displayName: 'Priya & Dev’s neighbour',
            content: 'We will feed the cat. Go get married without worrying about the flat.',
            visible: true,
            daysAgo: 26,
        },
        {
            displayName: 'The hiking group',
            content: 'You survived that rainstorm on the trail; you can survive seating charts. Rooting for you.',
            visible: true,
            daysAgo: 27,
        },
        {
            displayName: 'Jordan',
            content: 'Alex is crying happy tears already. I am pretending I am not. Love you both.',
            visible: true,
            daysAgo: 28,
        },
        {
            displayName: 'Chioma & David',
            content: 'Double-checking: Zara is definitely not allowed to give a toast without a script. (We are joking. Mostly.)',
            visible: true,
            daysAgo: 29,
        },
        {
            content: 'From overseas with terrible Wi‑Fi — congratulations! We will raise a cup in your time zone.',
            visible: true,
            daysAgo: 30,
        },
        {
            displayName: 'Elena’s sister',
            content: 'I have the tissues packed. Do not look at me during the vows.',
            visible: true,
            daysAgo: 31,
        },
        {
            displayName: 'River',
            content: 'PS from last time: the GF options on the RSVP made me feel seen. Thank you again.',
            visible: true,
            daysAgo: 32,
        },
        {
            displayName: 'Uncle Theo’s +1',
            content: 'He told me to “keep it brief.” Congratulations to two wonderful humans.',
            visible: true,
            daysAgo: 33,
        },
        {
            displayName: 'The band (maybe)',
            content: 'If this posts twice, blame the sound check. Either way — congrats!',
            visible: true,
            daysAgo: 34,
        },
        {
            displayName: 'Pat',
            content: 'Representing the Chen table: we are ready for speeches, dessert, and whatever you planned for midnight.',
            visible: true,
            daysAgo: 35,
        },
        {
            displayName: 'A random cousin',
            content: 'Found the website. Found the guestbook. Found my keyboard. Hello and congratulations!',
            visible: true,
            daysAgo: 36,
        },
        {
            content: 'Your photographers are going to earn their fee — you two are disgustingly photogenic. Best wishes.',
            visible: true,
            daysAgo: 37,
        },
        {
            displayName: 'Ben',
            content: 'Flight booked. Fingers crossed for on-time landing. Either way I am there in spirit if not in body.',
            visible: true,
            daysAgo: 38,
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
            await db.invites.update(
                invite.id,
                row.phone,
                row.email,
                row.notes,
                row.carpoolRequested === true,
                row.carpoolSpotsOffered !== undefined ? row.carpoolSpotsOffered : 0
            );
        }
    }

    async createGuestbookEntries(db: DatabaseConnection) {
        const dummyPhotoPaths = await DummyData.listSortedDummyPhotoPaths();
        let dummyPhotoSlot = 0;

        for (const row of this.guestbookSeeds) {
            const author = await db.authors.create();
            let photo: Photo | undefined;
            if (row.attachDummyPhoto && dummyPhotoPaths.length > 0) {
                const srcPath = dummyPhotoPaths[dummyPhotoSlot % dummyPhotoPaths.length];
                dummyPhotoSlot += 1;
                const data = await fs.promises.readFile(srcPath);
                photo = await db.photos.create(
                    path.basename(srcPath),
                    DummyData.imageMimeTypeForPath(srcPath),
                    data
                );
            }
            const entry = await db.guestbook.create(
                author,
                row.visible,
                row.content,
                row.displayName,
                photo
            );
            const created = new Date();
            created.setDate(created.getDate() - row.daysAgo);
            entry.created = created;
            entry.updated = created;
        }
        tempStore.guestbook.sort((a, b) => b.created.getTime() - a.created.getTime());

        if (process.env.NODE_ENV === 'development') {
            const fixtureAuthor = await db.authors.create();
            const now = new Date();
            const normal = await db.guestbook.create(
                fixtureAuthor,
                true,
                'Dev fixture — normal post (public and not moderated).',
                'Dev fixture'
            );
            normal.created = now;
            normal.updated = now;

            const notPublic = await db.guestbook.create(
                fixtureAuthor,
                false,
                'Dev fixture — not on the public guestbook (visible unchecked).',
                'Dev fixture'
            );
            notPublic.created = now;
            notPublic.updated = now;

            const moderated = await db.guestbook.create(
                fixtureAuthor,
                true,
                'Dev fixture — removed by moderator (moderated flag).',
                'Dev fixture'
            );
            moderated.created = now;
            moderated.updated = now;
            moderated.moderated = true;
            moderated.moderationReason = 'Dev fixture — sample moderator note.';

            tempStore.guestbookDevFixtureAuthorId = fixtureAuthor.id;
            tempStore.guestbook.sort((a, b) => b.created.getTime() - a.created.getTime());
        }
    }
}
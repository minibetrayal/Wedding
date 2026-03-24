import fs from "fs";
import path from "path";

import { Invite } from "../def/types/Invite";
import { Author } from "../def/types/Author";
import { GuestbookEntry } from "../def/types/GuestbookEntry";
import { Photo, PhotoType } from "../def/types/Photo";
import { Invitee } from "../def/types/Invitee";
import { Projector, ProjectorMode } from "../def/types/Projector";
import { FerryService, FerryServiceTo } from "../def/types/FerryService";

import { ConnectionSupplier } from "../def/interfaces/ConnectionSupplier";
import { AuthorConnection } from "../def/interfaces/AuthorConnection";
import { GuestbookConnection } from "../def/interfaces/GuestbookConnection";
import { InviteConnection } from "../def/interfaces/InviteConnection";
import { InviteeConnection } from "../def/interfaces/InviteeConnection";
import { PhotoConnection } from "../def/interfaces/PhotoConnection";
import { ProjectorConnection } from "../def/interfaces/ProjectorConnection";
import { FerryServiceConnection } from "../def/interfaces/FerryServiceConnection";

import { DbNotFoundError } from "../dbErrors";


const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const photosDir = path.join(process.cwd(), 'photos');

let invites: Invite[] = [];
let authors: Author[] = [];
let guestbook: GuestbookEntry[] = [];
let photos: Photo[] = [];
let invitees: Invitee[] = [];
let projector: Projector = new Projector('home', '', 30_000, false);
let ferryServices: FerryService[] = [];

const created: Set<string> = new Set();

function createSimpleId(): string {
    const length = 6;
    const chars = alpha.split('');
    let id: string;
    do {
        id = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (created.has(id));
    created.add(id);
    return id;
}

class TempInviteConnection implements InviteConnection {
    async get(inviteId: string): Promise<Invite> {
        const invite = invites.find(inv => inv.id === inviteId);
        if (!invite) throw new DbNotFoundError('Invite');
        return invite;
    }

    async getAll(): Promise<Invite[]> {
        return invites;
    }

    async create(name: string, invitees: Invitee[]): Promise<Invite> {
        const invite = new Invite(createSimpleId(), name, invitees);
        invites.push(invite);
        return invite;
    }

    async delete(inviteId: string): Promise<void> {
        const before = invites.length;
        invites = invites.filter(inv => inv.id !== inviteId);
        if (invites.length === before) throw new DbNotFoundError('Invite');
    }

    async update(
        inviteId: string,
        phone?: string,
        email?: string,
        notes?: string,
        carpoolRequested?: boolean,
        carpoolSpotsOffered?: number
    ): Promise<void> {
        const existingInvite = invites.find(i => i.id === inviteId);
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
        const existingInvite = invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.name = name;
        existingInvite.invitees = invitees;
    }

    async updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void> {
        const existingInvite = invites.find(i => i.id === inviteId);
        if (!existingInvite) throw new DbNotFoundError('Invite');
        existingInvite.seen = seen;
        existingInvite.responded = responded;
    }
}

class TempAuthorConnection implements AuthorConnection {
    async get(authorId: string): Promise<Author> {
        const author = authors.find(a => a.id === authorId);
        if (!author) throw new DbNotFoundError('Author');
        return author;
    }

    async getAll(): Promise<Author[]> {
        return authors;
    }

    async create(): Promise<Author> {
        const author = new Author(crypto.randomUUID());
        authors.push(author);
        return author;
    }
}

class TempGuestbookConnection implements GuestbookConnection {
    async get(entryId: string): Promise<GuestbookEntry> {
        const entry = guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        return entry;
    }

    async getAll(): Promise<GuestbookEntry[]> {
        guestbook.sort((a, b) => b.created.getTime() - a.created.getTime());
        return guestbook;
    }

    async count(): Promise<number> {
        return guestbook.length;
    }

    async create(
        author: Author,
        visible: boolean,
        content?: string,
        displayName?: string,
        photo?: Photo
    ): Promise<GuestbookEntry> {
        const entry = new GuestbookEntry(
            crypto.randomUUID(),
            author,
            visible,
            content,
            displayName,
            photo
        );
        guestbook.unshift(entry);
        return entry;
    }

    async delete(entryId: string): Promise<void> {
        const entry = guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        guestbook = guestbook.filter(e => e.id !== entryId);
    }

    async update(
        entryId: string,
        visible: boolean,
        content?: string,
        displayName?: string,
        photo?: Photo
    ): Promise<void> {
        const entry = guestbook.find(e => e.id === entryId);
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
        const entry = guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.moderated = true;
        const trimmed = moderationReason?.trim();
        entry.moderationReason = trimmed && trimmed.length > 0 ? trimmed : undefined;
        entry.updated = new Date();
        entry.pendingRemoderation = automoderated === true;
    }

    async show(entryId: string): Promise<void> {
        const entry = guestbook.find(e => e.id === entryId);
        if (!entry) throw new DbNotFoundError('Entry');
        entry.moderated = false;
        entry.moderationReason = undefined;
        entry.pendingRemoderation = false;
        entry.updated = new Date();
    }
}

class TempPhotoConnection implements PhotoConnection {
    async get(photoId: string): Promise<Photo> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        return photo;
    }

    async getAll(type: PhotoType = 'guestbook'): Promise<Photo[]> {
        return photos.filter(p => p.type === type);
    }

    async getPhoto(photoId: string): Promise<Buffer> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        const filePath = path.join(photosDir, photo.filename());
        return await fs.promises.readFile(filePath);
    }

    async create(name: string, mimeType: string, data: Buffer, type: PhotoType = 'guestbook', captionOrStyle?: string): Promise<Photo> {
        const photo = new Photo(crypto.randomUUID(), name, mimeType, type, captionOrStyle);
        photos.push(photo);

        await fs.promises.mkdir(photosDir, { recursive: true });
        const filePath = path.join(photosDir, photo.filename());
        await fs.promises.writeFile(filePath, data);
        return photo;
    }

    async delete(photoId: string): Promise<void> {
        const photo = photos.find(p => p.id === photoId);
        photos = photos.filter(p => p.id !== photoId);
        if (photo) {
            const filePath = path.join(photosDir, photo.filename());
            await fs.promises.unlink(filePath).catch(() => { /* ignore if file missing */ });
        }
    }

    async updateCaptionOrStyle(photoId: string, captionOrStyle?: string): Promise<void> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        photo.captionOrStyle = captionOrStyle;
        photo.updated = new Date();
    }
}

class TempInviteeConnection implements InviteeConnection {
    async get(inviteeId: string): Promise<Invitee> {
        const invitee = invitees.find(i => i.id === inviteeId);
        if (!invitee) throw new DbNotFoundError('Invitee');
        return invitee;
    }

    async getAll(): Promise<Invitee[]> {
        return invitees;
    }

    async create(name: string, attending?: boolean, dietaryRestrictions?: string): Promise<Invitee> {
        const invitee = new Invitee(crypto.randomUUID(), name, attending, dietaryRestrictions);
        invitees.push(invitee);
        return invitee;
    }

    async delete(inviteeId: string): Promise<void> {
        invitees = invitees.filter(i => i.id !== inviteeId);
    }
    
    async update(inviteeId: string, name: string, attending?: boolean, dietaryRestrictions?: string): Promise<void> {
        const invitee = invitees.find(i => i.id === inviteeId);
        if (!invitee) throw new DbNotFoundError('Invitee');
        invitee.name = name;
        invitee.attending = attending;
        invitee.dietaryRestrictions = dietaryRestrictions;
    }
}

class TempProjectorConnection implements ProjectorConnection {
    async get(): Promise<Projector> {
        return new Projector(
            projector.mode, 
            projector.message, 
            projector.dwellMs, 
            projector.paused);
    }
    async setMode(mode: ProjectorMode): Promise<void> {
        projector.mode = mode;
    }
    async setMessage(message: string): Promise<void> {
        projector.message = message;
    }
    async setDwellMs(dwellMs: number): Promise<void> {
        projector.dwellMs = dwellMs;
    }
    async getGuestbookEntryIds(): Promise<string[]> {
        return guestbook.filter(e => e.visible && !e.moderated).map(e => e.id);
    }
}

class TempFerryServiceConnection implements FerryServiceConnection {
    async getAll(to: FerryServiceTo): Promise<FerryService[]> {
        return [...ferryServices]
            .filter((s) => s.to === to)
            .sort((a, b) => a.time.getTime() - b.time.getTime());
    }

    async replaceAll(services: FerryService[]): Promise<void> {
        ferryServices.length = 0;
        ferryServices.push(...services);
    }
}

export class TempConnectionSupplier implements ConnectionSupplier {
    async prepare(): Promise<void> {
        await fs.promises.rm(photosDir, { recursive: true, force: true });
        invites.length = 0;
        authors.length = 0;
        guestbook.length = 0;
        photos.length = 0;
        invitees.length = 0;
        ferryServices.length = 0;
        projector = new Projector('home', '', 30_000, false);
        created.clear();
    }

    getInviteConnection(): InviteConnection {
        return new TempInviteConnection();
    }
    getAuthorConnection(): AuthorConnection {
        return new TempAuthorConnection();
    }
    getGuestbookConnection(): GuestbookConnection {
        return new TempGuestbookConnection();
    }
    getPhotoConnection(): PhotoConnection {
        return new TempPhotoConnection();
    }
    getInviteeConnection(): InviteeConnection {
        return new TempInviteeConnection();
    }
    getProjectorConnection(): ProjectorConnection {
        return new TempProjectorConnection();
    }
    getFerryServiceConnection(): FerryServiceConnection {
        return new TempFerryServiceConnection();
    }
}
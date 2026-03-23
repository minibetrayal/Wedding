import { Author } from "./types/Author";
import { GuestbookEntry } from "./types/GuestbookEntry";
import { Projector, ProjectorMode } from "./types/Projector";
import { Invite } from "./types/Invite";
import { Invitee } from "./types/Invitee";
import { Photo } from "./types/Photo";

export interface InviteConnection {
    get(inviteId: string): Promise<Invite>;
    getAll(): Promise<Invite[]>;
    create(name: string, invitees: Invitee[]): Promise<Invite>;
    delete(inviteId: string): Promise<void>;
    update(inviteId: string, phone?: string, email?: string, notes?: string, carpoolRequested?: boolean, carpoolSpotsOffered?: number): Promise<void>;
    updateInvite(inviteId: string, name: string, invitees: Invitee[]): Promise<void>
    updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void>;
}

export interface AuthorConnection {
    get(authorId: string): Promise<Author>;
    getAll(): Promise<Author[]>;
    create(): Promise<Author>;
}

export interface GuestbookConnection {
    get(entryId: string): Promise<GuestbookEntry>;
    getAll(): Promise<GuestbookEntry[]>;
    create(author: Author, visible: boolean, content?: string, displayName?: string, photo?: Photo): Promise<GuestbookEntry>;
    delete(entryId: string): Promise<void>;
    update(entryId: string, visible: boolean, content?: string, displayName?: string, photo?: Photo): Promise<void>;
    hide(entryId: string, moderationReason?: string, automoderated?: boolean): Promise<void>;
    show(entryId: string): Promise<void>;
}

export interface PhotoConnection {
    get(photoId: string): Promise<Photo>;
    getAll(professional: boolean): Promise<Photo[]>;
    getPhoto(photoId: string): Promise<Buffer>;
    create(name: string, mimeType: string, data: Buffer, professional?: boolean, caption?: string): Promise<Photo>;
    delete(photoId: string): Promise<void>;
    updateCaption(photoId: string, caption?: string): Promise<void>;
}

export interface InviteeConnection {
    get(inviteeId: string): Promise<Invitee>;
    getAll(): Promise<Invitee[]>;
    create(name: string, attending?: boolean, dietaryRestrictions?: string): Promise<Invitee>;
    delete(inviteeId: string): Promise<void>;
    update(inviteeId: string, name: string, attending?: boolean, dietaryRestrictions?: string): Promise<void>;
}

export interface ProjectorConnection {
    get(): Promise<Projector>;
    setMode(mode: ProjectorMode): Promise<void>;
    setMessage(message: string): Promise<void>;
    setDwellMs(dwellMs: number): Promise<void>;
    getGuestbookEntryIds(): Promise<string[]>;
}

export interface DatabaseConnection {
    invites: InviteConnection;
    authors: AuthorConnection;
    guestbook: GuestbookConnection;
    photos: PhotoConnection;
    invitees: InviteeConnection;
    projector: ProjectorConnection;

    init(): Promise<DatabaseConnection>;
}
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { Invite } from "../def/types/Invite";
import { Author } from "../def/types/Author";
import { GuestbookEntry } from "../def/types/GuestbookEntry";
import { Photo, PhotoType } from "../def/types/Photo";
import { Invitee } from "../def/types/Invitee";
import { Projector, ProjectorMode } from "../def/types/Projector";
import { FerryService, FerryServiceTo } from "../def/types/FerryService";
import { Names } from "../def/types/Names";
import { DEFAULT_SCHEDULE_SNAPSHOT, ScheduleSnapshot } from "../def/types/ScheduledEvent";
import { Location, LocationType } from "../def/types/Location";
import { Time, TimeType } from "../def/types/Time";
import { MenuCourse } from "../def/types/MenuCourse";
import { MenuItem } from "../def/types/MenuItem";
import { DEFAULT_SETTINGS, Settings } from "../def/types/Settings";

import { ConnectionSupplier } from "../def/interfaces/ConnectionSupplier";
import { AuthorConnection } from "../def/interfaces/AuthorConnection";
import { GuestbookConnection } from "../def/interfaces/GuestbookConnection";
import { InviteConnection } from "../def/interfaces/InviteConnection";
import { InviteeConnection } from "../def/interfaces/InviteeConnection";
import { PhotoConnection } from "../def/interfaces/PhotoConnection";
import { ProjectorConnection } from "../def/interfaces/ProjectorConnection";
import { FerryServiceConnection } from "../def/interfaces/FerryServiceConnection";
import { NamesConnection } from "../def/interfaces/NamesConnection";
import { ScheduleConnection } from "../def/interfaces/ScheduleConnection";
import { LocationConnection } from "../def/interfaces/LocationConnection";
import { TimesConnection } from "../def/interfaces/TimesConnection";
import { MenuConnection } from "../def/interfaces/MenuConnection";
import { SettingsConnection } from "../def/interfaces/SettingsConnection";

import { DbNotFoundError, DbError } from "../dbErrors";
import { formatYYYYMMDD, zonedToDate } from "../../util/timeUtils";
import { Faq } from "../def/types/Faq";
import { FaqConnection } from "../def/interfaces/FaqConnection";
import { PhotoStorageConnection } from "../def/interfaces/PhotoStorageConnection";
import { LocalPhotoStorageConnection } from "./LocalPhotoStorageConnection";

const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const photosDir = path.join(process.cwd(), 'photos');

let invites: Invite[] = [];
let authors: Author[] = [];
let guestbook: GuestbookEntry[] = [];
let photos: Photo[] = [];
let invitees: Invitee[] = [];
let ferryServices: FerryService[] = [];
let ferryServiceLink: string = '';
let ferryServiceCost: string = '';
let projector: Projector = new Projector('home', '', 30_000, false);
let names: Names = new Names('', '', '', '', '');

let eventDate: string = formatYYYYMMDD(new Date());
let schedule: ScheduleSnapshot = {...DEFAULT_SCHEDULE_SNAPSHOT};
let locations: Partial<Record<LocationType, Location>> = {};
let times: Partial<Record<TimeType, Time>> = {};
let menu: MenuCourse[] = [];
let faqs: Faq[] = [];
let settings: Settings = {...DEFAULT_SETTINGS};

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

    async getRemoderationCount(): Promise<number> {
        return guestbook.filter(e => e.pendingRemoderation).length;
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
    private readonly photoStorage: PhotoStorageConnection = new LocalPhotoStorageConnection();

    async get(photoId: string): Promise<Photo> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        return photo;
    }

    async getAll(type: PhotoType = 'guestbook'): Promise<Photo[]> {
        return photos.filter(p => p.type === type).sort((a, b) => a.sortKey - b.sortKey);
    }

    async getPhoto(photoId: string): Promise<Buffer> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        return await this.photoStorage.get(photo);
    }

    async create(name: string, mimeType: string, data: Buffer, type: PhotoType = 'guestbook', captionOrStyle?: string): Promise<Photo> {
        const sortKey = photos.filter(p => p.type === type).length;
        const photo = new Photo(crypto.randomUUID(), name, mimeType, type, sortKey, captionOrStyle);
        photos.push(photo);

        await this.photoStorage.save(photo, data);
        return photo;
    }

    async delete(photoId: string): Promise<void> {
        const photo = photos.find(p => p.id === photoId);
        photos = photos.filter(p => p.id !== photoId);
        if (photo) {
            await this.photoStorage.delete(photo);
        }
    }

    async updateCaptionOrStyle(photoId: string, captionOrStyle?: string): Promise<void> {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) throw new DbNotFoundError('Photo');
        photo.captionOrStyle = captionOrStyle;
        photo.updated = new Date();
    }

    async move(id: string, direction: 'up' | 'down'): Promise<void> {
        const photo = photos.find((x) => x.id === id);
        if (!photo) throw new DbNotFoundError('Photo');
        const index = photos.indexOf(photo);
        const swapPhoto = photos.find((x) => x.sortKey === photo.sortKey + (direction === 'up' ? -1 : 1));
        if (!swapPhoto) throw new DbNotFoundError('Photo');
        const newIndex = photos.indexOf(swapPhoto)
        if (newIndex < 0 || newIndex >= photos.length) throw new DbNotFoundError('Photo');
        photos[index] = swapPhoto;
        photos[newIndex] = photo;
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
    async setPaused(paused: boolean): Promise<void> {
        projector.paused = paused;
    }
    async getGuestbookEntryIds(): Promise<string[]> {
        return guestbook.filter(e => e.visible && !e.moderated).map(e => e.id);
    }
}

class TempFerryServiceConnection implements FerryServiceConnection {
    async getAll(to: FerryServiceTo): Promise<FerryService[]> {
        const tempDate = formatYYYYMMDD(new Date());
        const ztd = (time: string) => zonedToDate(tempDate, time).getTime();
        return [...ferryServices]
            .filter((s) => s.to === to)
            .sort((a, b) => ztd(a.time) - ztd(b.time));
    }

    async replaceAll(services: FerryService[]): Promise<void> {
        ferryServices.length = 0;
        ferryServices.push(...services);
    }
    async getLink(): Promise<string> {
        return ferryServiceLink;
    }
    async setLink(link: string): Promise<void> {
        ferryServiceLink = link;
    }
    async getCost(): Promise<string> {
        return ferryServiceCost;
    }
    async setCost(cost: string): Promise<void> {
        ferryServiceCost = cost;
    }
}

class TempNamesConnection implements NamesConnection {
    async getNames(): Promise<string> {
        return names.names;
    }
    async setNames(newNames: string): Promise<void> {
        names.names = newNames;
    }
    async getNamesShort(): Promise<string> {
        return names.namesShort;
    }
    async setNamesShort(namesShort: string): Promise<void> {
        names.namesShort = namesShort;
    }
    async getContactName(): Promise<string> {
        return names.contactName;
    }
    async setContactName(contactName: string): Promise<void> {
        names.contactName = contactName;
    }
    async getContactPhone(): Promise<string> {
        return names.contactPhone;
    }
    async setContactPhone(contactPhone: string): Promise<void> {
        names.contactPhone = contactPhone;
    }

    async getContactEmail(): Promise<string> {
        return names.contactEmail;
    }
    async setContactEmail(contactEmail: string): Promise<void> {
        names.contactEmail = contactEmail;
    }
}

class TempScheduleConnection implements ScheduleConnection {
    async get(): Promise<ScheduleSnapshot> {
        return schedule;
    }

    async set(snapshot: ScheduleSnapshot): Promise<void> {
        schedule = snapshot;
    }

    async getDate(): Promise<string> {
        return eventDate;
    }
    async setDate(date: string): Promise<void> {
        eventDate = date;
    }
}

class TempLocationConnection implements LocationConnection {
    async get(type: LocationType): Promise<Location> {
        return locations[type] ?? new Location('', '');
    }

    async getAll(): Promise<Record<LocationType, Location>> {
        const out = {} as Record<LocationType, Location>;
        for (const t of Object.values(LocationType)) {
            out[t] = await this.get(t);
        }
        return out;
    }

    async set(type: LocationType, location: Location): Promise<void> {
        locations[type] = location;
    }
}

class TempTimesConnection implements TimesConnection {
    async get(type: TimeType): Promise<Time> {
        return times[type] ?? new Time(0);
    }
    async getAll(): Promise<Record<TimeType, Time>> {
        const out = {} as Record<TimeType, Time>;
        for (const t of Object.values(TimeType)) {
            out[t] = await this.get(t);
        }
        return out;
    }
    async set(type: TimeType, time: Time): Promise<void> {
        times[type] = time;
    }
}

class TempMenuConnection implements MenuConnection {
    async get(course: string): Promise<MenuCourse> {
        const courseObj = menu.find(c => c.name === course);
        if (!courseObj) throw new DbNotFoundError('Course');
        return courseObj;
    }
    async getAll(): Promise<MenuCourse[]> {
        return menu;
    }
    async createCourse(course: string): Promise<void> {
        if (menu.some(c => c.name === course)) throw new DbError('Course already exists');
        menu.push(new MenuCourse(course, []));
    }
    async removeCourse(course: string): Promise<void> {
        menu = menu.filter(c => c.name !== course);
    }
    async updateCourse(course: string, items: MenuItem[]): Promise<void> {
        const courseObj = menu.find(c => c.name === course);
        if (!courseObj) throw new DbNotFoundError('Course');
        courseObj.items = items;
    }
}

class TempFaqConnection implements FaqConnection {
    async getAll(): Promise<Faq[]> {
        faqs.sort((a, b) => a.sortKey - b.sortKey);
        return faqs;
    }

    async get(id: string): Promise<Faq> {
        const f = faqs.find((x) => x.id === id);
        if (!f) throw new DbNotFoundError('FAQ');
        return f;
    }

    async create(question: string, answer: string): Promise<Faq> {
        const f = new Faq(crypto.randomUUID(), question, answer, faqs.length);
        faqs.push(f);
        return f;
    }

    async update(id: string, question: string, answer: string): Promise<void> {
        const f = faqs.find((x) => x.id === id);
        if (!f) throw new DbNotFoundError('FAQ');
        f.question = question;
        f.answer = answer;
    }

    async delete(id: string): Promise<void> {
        const before = faqs.length;
        const existing = faqs.find((x) => x.id === id);
        if (!existing) throw new DbNotFoundError('FAQ');
        faqs = faqs
            .filter((x) => x.id !== id)
            .map((x) => new Faq(x.id, x.question, x.answer, x.sortKey > existing.sortKey ? x.sortKey - 1 : x.sortKey));
        if (faqs.length === before) throw new DbNotFoundError('FAQ');
    }

    async move(id: string, direction: 'up' | 'down'): Promise<void> {
        const faq = faqs.find((x) => x.id === id);
        if (!faq) throw new DbNotFoundError('FAQ');
        const index = faqs.indexOf(faq);
        const newIndex = index + (direction === 'up' ? -1 : 1);
        if (newIndex < 0 || newIndex >= faqs.length) throw new DbNotFoundError('FAQ');
        faqs[index] = faqs[newIndex];
        faqs[newIndex] = faq;
    }
}

class TempSettingsConnection implements SettingsConnection {
    async get<K extends keyof Settings>(key: K): Promise<Settings[K]> {
        return settings[key];
    }
    async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
        settings[key] = value;
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
        ferryServiceLink = '';
        ferryServiceCost = '';
        projector = new Projector('home', '', 30_000, false);
        names = new Names('', '', '', '', '');
        schedule = {...DEFAULT_SCHEDULE_SNAPSHOT};
        locations = {};
        times = {};
        menu = [];
        faqs = [];
        settings = {...DEFAULT_SETTINGS};
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
    getNamesConnection(): NamesConnection {
        return new TempNamesConnection();
    }
    getScheduleConnection(): ScheduleConnection {
        return new TempScheduleConnection();
    }
    getLocationConnection(): LocationConnection {
        return new TempLocationConnection();
    }
    getTimesConnection(): TimesConnection {
        return new TempTimesConnection();
    }
    getMenuConnection(): MenuConnection {
        return new TempMenuConnection();
    }
    getFaqConnection(): FaqConnection {
        return new TempFaqConnection();
    }
    getSettingsConnection(): SettingsConnection {
        return new TempSettingsConnection();
    }
}
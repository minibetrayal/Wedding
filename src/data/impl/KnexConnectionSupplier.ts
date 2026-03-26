import knex, { type Knex } from 'knex';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { ConnectionSupplier } from '../def/interfaces/ConnectionSupplier';
import type { AuthorConnection } from '../def/interfaces/AuthorConnection';
import type { FerryServiceConnection } from '../def/interfaces/FerryServiceConnection';
import type { GuestbookConnection } from '../def/interfaces/GuestbookConnection';
import type { InviteConnection } from '../def/interfaces/InviteConnection';
import type { InviteeConnection } from '../def/interfaces/InviteeConnection';
import type { LocationConnection } from '../def/interfaces/LocationConnection';
import type { MenuConnection } from '../def/interfaces/MenuConnection';
import type { NamesConnection } from '../def/interfaces/NamesConnection';
import type { PhotoConnection } from '../def/interfaces/PhotoConnection';
import type { ProjectorConnection } from '../def/interfaces/ProjectorConnection';
import type { ScheduleConnection } from '../def/interfaces/ScheduleConnection';
import type { TimesConnection } from '../def/interfaces/TimesConnection';
import { Author } from '../def/types/Author';
import { FerryService, type FerryServiceTo } from '../def/types/FerryService';
import { GuestbookEntry } from '../def/types/GuestbookEntry';
import { Invite } from '../def/types/Invite';
import { Invitee } from '../def/types/Invitee';
import { Location, LocationType } from '../def/types/Location';
import { MenuCourse } from '../def/types/MenuCourse';
import { MenuItem, type MenuTag } from '../def/types/MenuItem';
import { Photo, type PhotoType } from '../def/types/Photo';
import { Projector, type ProjectorMode } from '../def/types/Projector';
import { DEFAULT_SCHEDULE_SNAPSHOT, ScheduleSnapshot, ScheduledEvent } from '../def/types/ScheduledEvent';
import { Time, TimeType } from '../def/types/Time';
import { DbError, DbNotFoundError } from '../dbErrors';
import { formatYYYYMMDD } from '../../util/timeUtils';
import { Faq } from '../def/types/Faq';
import { FaqConnection } from '../def/interfaces/FaqConnection';

const SINGLETON_ID = '1';
const PHOTOS_DIR = path.join(process.cwd(), 'photos');
const INVITE_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function toBool(v: unknown): boolean {
    return v === true || v === 1 || v === '1';
}

function toBoolOrUndef(v: unknown): boolean | undefined {
    if (v === null || v === undefined) return undefined;
    return toBool(v);
}

function parseDate(v: unknown): Date {
    if (v instanceof Date) return v;
    if (typeof v === 'string' || typeof v === 'number') return new Date(v);
    return new Date();
}

function mapPhotoRow(row: Record<string, unknown>): Photo {
    const p = new Photo(
        String(row.id),
        String(row.name),
        String(row.mime_type),
        row.type as PhotoType,
        Number(row.sort_key),
        row.caption_or_style != null ? String(row.caption_or_style) : undefined,
    );
    p.created = parseDate(row.created);
    p.updated = parseDate(row.updated);
    return p;
}

async function createUniqueInviteId(knex: Knex, length: number = 6): Promise<string> {
    const chars = INVITE_ID_CHARS.split('');
    for (let attempt = 0; attempt < 100; attempt++) {
        const id = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const exists = await knex('invites').where('id', id).first();
        if (!exists) return id;
    }
    return await createUniqueInviteId(knex, length + 1);
}

function insertReturningId(result: unknown): number {
    if (Array.isArray(result) && result[0] && typeof result[0] === 'object' && 'id' in result[0]) {
        return Number((result[0] as { id: number }).id);
    }
    if (result && typeof result === 'object' && 'id' in (result as object)) {
        return Number((result as { id: number }).id);
    }
    throw new DbError('Unexpected insert result');
}

class KnexInviteConnection implements InviteConnection {
    constructor(private readonly knex: Knex) {}

    private async loadInviteesForInvite(inviteId: string): Promise<Invitee[]> {
        const rows = await this.knex('invitees').where('invite_id', inviteId).orderBy('name');
        return rows.map(
            (r) =>
                new Invitee(
                    String(r.id),
                    String(r.name),
                    toBoolOrUndef(r.attending),
                    r.dietary_restrictions != null ? String(r.dietary_restrictions) : undefined,
                ),
        );
    }

    private async toInvite(row: Record<string, unknown>): Promise<Invite> {
        const invitees = await this.loadInviteesForInvite(String(row.id));
        const inv = new Invite(String(row.id), String(row.name), invitees);
        inv.phone = row.phone != null ? String(row.phone) : undefined;
        inv.email = row.email != null ? String(row.email) : undefined;
        inv.notes = row.notes != null ? String(row.notes) : undefined;
        inv.responded = toBool(row.responded);
        inv.seen = toBool(row.seen);
        inv.carpoolRequested = toBool(row.carpool_requested);
        inv.carpoolSpotsOffered = Number(row.carpool_spots_offered ?? 0);
        return inv;
    }

    async get(inviteId: string): Promise<Invite> {
        const row = await this.knex('invites').where('id', inviteId).first();
        if (!row) throw new DbNotFoundError('Invite');
        return this.toInvite(row as Record<string, unknown>);
    }

    async getAll(): Promise<Invite[]> {
        const rows = await this.knex('invites').orderBy('name');
        const out: Invite[] = [];
        for (const row of rows) {
            out.push(await this.toInvite(row as Record<string, unknown>));
        }
        return out;
    }

    async create(name: string, invitees: Invitee[]): Promise<Invite> {
        const id = await createUniqueInviteId(this.knex);
        await this.knex.transaction(async (trx) => {
            await trx('invites').insert({
                id,
                name,
                responded: false,
                seen: false,
                carpool_requested: false,
                carpool_spots_offered: 0,
            });
            for (const inv of invitees) {
                const n = await trx('invitees').where('id', inv.id).update({ invite_id: id });
                if (n === 0) throw new DbError('Invitee not found when creating invite');
            }
        });
        return this.get(id);
    }

    async delete(inviteId: string): Promise<void> {
        const n = await this.knex('invites').where('id', inviteId).delete();
        if (n === 0) throw new DbNotFoundError('Invite');
    }

    async update(
        inviteId: string,
        phone?: string,
        email?: string,
        notes?: string,
        carpoolRequested?: boolean,
        carpoolSpotsOffered?: number,
    ): Promise<void> {
        const row: Record<string, unknown> = {};
        if (phone !== undefined) row.phone = phone;
        if (email !== undefined) row.email = email;
        if (notes !== undefined) row.notes = notes;
        if (carpoolRequested !== undefined) row.carpool_requested = carpoolRequested;
        if (carpoolSpotsOffered !== undefined) row.carpool_spots_offered = carpoolSpotsOffered;
        if (Object.keys(row).length === 0) return;
        const n = await this.knex('invites').where('id', inviteId).update(row);
        if (n === 0) throw new DbNotFoundError('Invite');
    }

    async updateInvite(inviteId: string, name: string, invitees: Invitee[]): Promise<void> {
        const ids = invitees.map((i) => i.id);
        await this.knex.transaction(async (trx) => {
            const n = await trx('invites').where('id', inviteId).update({ name });
            if (n === 0) throw new DbNotFoundError('Invite');
            await trx('invitees')
                .where(function () {
                    this.where('invite_id', inviteId).orWhereIn('id', ids);
                })
                .delete();
            for (const inv of invitees) {
                await trx('invitees').insert({
                    id: inv.id,
                    invite_id: inviteId,
                    name: inv.name,
                    attending: inv.attending ?? null,
                    dietary_restrictions: inv.dietaryRestrictions ?? null,
                });
            }
        });
    }

    async updateStatus(inviteId: string, seen: boolean, responded: boolean): Promise<void> {
        const n = await this.knex('invites').where('id', inviteId).update({ seen, responded });
        if (n === 0) throw new DbNotFoundError('Invite');
    }
}

class KnexAuthorConnection implements AuthorConnection {
    constructor(private readonly knex: Knex) {}

    async get(authorId: string): Promise<Author> {
        const row = await this.knex('authors').where('id', authorId).first();
        if (!row) throw new DbNotFoundError('Author');
        return new Author(String((row as { id: string }).id));
    }

    async getAll(): Promise<Author[]> {
        const rows = await this.knex('authors').select('*');
        return rows.map((r) => new Author(String((r as { id: string }).id)));
    }

    async create(): Promise<Author> {
        const id = crypto.randomUUID();
        await this.knex('authors').insert({ id });
        return new Author(id);
    }
}

class KnexGuestbookConnection implements GuestbookConnection {
    constructor(private readonly knex: Knex) {}

    private async mapRow(row: Record<string, unknown>): Promise<GuestbookEntry> {
        const authorRow = await this.knex('authors').where('id', String(row.author_id)).first();
        if (!authorRow) throw new DbNotFoundError('Author');
        const author = new Author(String(authorRow.id));
        let photo: Photo | undefined;
        if (row.photo_id) {
            const photoRow = await this.knex('photos').where('id', String(row.photo_id)).first();
            if (photoRow) photo = mapPhotoRow(photoRow as Record<string, unknown>);
        }
        const entry = new GuestbookEntry(
            String(row.id),
            author,
            toBool(row.visible),
            row.content != null ? String(row.content) : undefined,
            row.display_name != null ? String(row.display_name) : undefined,
            photo,
        );
        entry.created = parseDate(row.created);
        entry.updated = parseDate(row.updated);
        entry.moderated = toBool(row.moderated);
        entry.moderationReason = row.moderation_reason != null ? String(row.moderation_reason) : undefined;
        entry.pendingRemoderation = toBool(row.pending_remoderation);
        return entry;
    }

    async get(entryId: string): Promise<GuestbookEntry> {
        const row = await this.knex('guestbook_entries').where('id', entryId).first();
        if (!row) throw new DbNotFoundError('Entry');
        return this.mapRow(row as Record<string, unknown>);
    }

    async getAll(): Promise<GuestbookEntry[]> {
        const rows = await this.knex('guestbook_entries').select('*');
        const out: GuestbookEntry[] = [];
        for (const row of rows) {
            out.push(await this.mapRow(row as Record<string, unknown>));
        }
        out.sort((a, b) => b.created.getTime() - a.created.getTime());
        return out;
    }

    async getRemoderationCount(): Promise<number> {
        const count = await this.knex('guestbook_entries').where('pending_remoderation', true).count('*');
        return Number(count[0].count);
    }

    async create(
        author: Author,
        visible: boolean,
        content?: string,
        displayName?: string,
        photo?: Photo,
    ): Promise<GuestbookEntry> {
        const id = crypto.randomUUID();
        await this.knex('guestbook_entries').insert({
            id,
            author_id: author.id,
            visible,
            content: content ?? null,
            display_name: displayName ?? null,
            photo_id: photo?.id ?? null,
            moderated: false,
            moderation_reason: null,
            pending_remoderation: false,
        });
        return this.get(id);
    }

    async delete(entryId: string): Promise<void> {
        const n = await this.knex('guestbook_entries').where('id', entryId).delete();
        if (n === 0) throw new DbNotFoundError('Entry');
    }

    async update(
        entryId: string,
        visible: boolean,
        content?: string,
        displayName?: string,
        photo?: Photo,
    ): Promise<void> {
        const existing = await this.knex('guestbook_entries').where('id', entryId).first();
        if (!existing) throw new DbNotFoundError('Entry');
        await this.knex('guestbook_entries')
            .where('id', entryId)
            .update({
                visible,
                content: content ?? null,
                display_name: displayName ?? null,
                photo_id: photo?.id ?? null,
                updated: this.knex.fn.now(),
                pending_remoderation: toBool((existing as { moderated: unknown }).moderated),
            });
    }

    async hide(entryId: string, moderationReason?: string, automoderated?: boolean): Promise<void> {
        const trimmed = moderationReason?.trim();
        const n = await this.knex('guestbook_entries')
            .where('id', entryId)
            .update({
                moderated: true,
                moderation_reason: trimmed && trimmed.length > 0 ? trimmed : null,
                updated: this.knex.fn.now(),
                pending_remoderation: automoderated === true,
            });
        if (n === 0) throw new DbNotFoundError('Entry');
    }

    async show(entryId: string): Promise<void> {
        const n = await this.knex('guestbook_entries')
            .where('id', entryId)
            .update({
                moderated: false,
                moderation_reason: null,
                pending_remoderation: false,
                updated: this.knex.fn.now(),
            });
        if (n === 0) throw new DbNotFoundError('Entry');
    }
}

class KnexPhotoConnection implements PhotoConnection {
    constructor(private readonly knex: Knex) {}

    async get(photoId: string): Promise<Photo> {
        const row = await this.knex('photos').where('id', photoId).first();
        if (!row) throw new DbNotFoundError('Photo');
        return mapPhotoRow(row as Record<string, unknown>);
    }

    async getAll(type: PhotoType): Promise<Photo[]> {
        const rows = await this.knex('photos').where('type', type).orderBy('sort_key', 'asc');
        return rows.map((r) => mapPhotoRow(r as Record<string, unknown>));
    }

    async getPhoto(photoId: string): Promise<Buffer> {
        const photo = await this.get(photoId);
        const filePath = path.join(PHOTOS_DIR, photo.filename());
        return fs.promises.readFile(filePath);
    }

    async create(
        name: string,
        mimeType: string,
        data: Buffer,
        type: PhotoType = 'guestbook',
        captionOrStyle?: string,
    ): Promise<Photo> {
        
        const agg = await this.knex('photos').where('type', type).max('sort_key').first();
        const maxSort = maxSortKeyFromAggregateRow(agg as Record<string, unknown> | undefined);
        const sortKey = maxSort + 1;

        const id = crypto.randomUUID();
        const photo = new Photo(id, name, mimeType, type, sortKey, captionOrStyle);
        await fs.promises.mkdir(PHOTOS_DIR, { recursive: true });
        const filePath = path.join(PHOTOS_DIR, photo.filename());
        await fs.promises.writeFile(filePath, data);

        await this.knex('photos').insert({
            id,
            name,
            mime_type: mimeType,
            type,
            sort_key: sortKey,
            caption_or_style: captionOrStyle ?? null,
        });
        return this.get(id);
    }

    async delete(photoId: string): Promise<void> {
        const photo = await this.knex('photos').where('id', photoId).first();
        if (!photo) return;
        const p = mapPhotoRow(photo as Record<string, unknown>);
        await this.knex('photos').where('id', photoId).delete();
        const filePath = path.join(PHOTOS_DIR, p.filename());
        await fs.promises.unlink(filePath).catch(() => {});
    }

    async updateCaptionOrStyle(photoId: string, captionOrStyle?: string): Promise<void> {
        const n = await this.knex('photos')
            .where('id', photoId)
            .update({ caption_or_style: captionOrStyle ?? null, updated: this.knex.fn.now() });
        if (n === 0) throw new DbNotFoundError('Photo');
    }

    async move(id: string, direction: 'up' | 'down'): Promise<void> {
        const photo = await this.get(id);
        const previous = await this.knex('photos')
            .where('type', photo.type)
            .andWhere('sort_key', photo.sortKey - (direction === 'up' ? 1 : -1))
            .first();
        if (!previous) throw new DbNotFoundError('Photo');
        await this.knex('photos').where('id', id).update({ sort_key: previous.sort_key });
        await this.knex('photos').where('id', previous.id).update({ sort_key: photo.sortKey });
    }
}

class KnexInviteeConnection implements InviteeConnection {
    constructor(private readonly knex: Knex) {}

    async get(inviteeId: string): Promise<Invitee> {
        const row = await this.knex('invitees').where('id', inviteeId).first();
        if (!row) throw new DbNotFoundError('Invitee');
        return new Invitee(
            String(row.id),
            String(row.name),
            toBoolOrUndef(row.attending),
            row.dietary_restrictions != null ? String(row.dietary_restrictions) : undefined,
        );
    }

    async getAll(): Promise<Invitee[]> {
        const rows = await this.knex('invitees').select('*');
        return rows.map(
            (r) =>
                new Invitee(
                    String(r.id),
                    String(r.name),
                    toBoolOrUndef(r.attending),
                    r.dietary_restrictions != null ? String(r.dietary_restrictions) : undefined,
                ),
        );
    }

    async create(name: string, attending?: boolean, dietaryRestrictions?: string): Promise<Invitee> {
        const id = crypto.randomUUID();
        await this.knex('invitees').insert({
            id,
            name,
            attending: attending ?? null,
            dietary_restrictions: dietaryRestrictions ?? null,
            invite_id: null,
        });
        return new Invitee(id, name, attending, dietaryRestrictions);
    }

    async delete(inviteeId: string): Promise<void> {
        await this.knex('invitees').where('id', inviteeId).delete();
    }

    async update(
        inviteeId: string,
        name: string,
        attending?: boolean,
        dietaryRestrictions?: string,
    ): Promise<void> {
        const n = await this.knex('invitees')
            .where('id', inviteeId)
            .update({
                name,
                attending: attending ?? null,
                dietary_restrictions: dietaryRestrictions ?? null,
            });
        if (n === 0) throw new DbNotFoundError('Invitee');
    }
}

class KnexLocationConnection implements LocationConnection {
    constructor(private readonly knex: Knex) {}

    async get(type: LocationType): Promise<Location> {
        const row = await this.knex('locations').where('location_type', type).first();
        if (!row) return new Location('', '');
        return new Location(
            String(row.name ?? ''),
            row.address != null ? String(row.address) : undefined,
        );
    }

    async getAll(): Promise<Record<LocationType, Location>> {
        const out = {} as Record<LocationType, Location>;
        for (const t of Object.values(LocationType)) {
            out[t] = await this.get(t);
        }
        return out;
    }

    async set(type: LocationType, location: Location): Promise<void> {
        await this.knex('locations')
            .insert({
                location_type: type,
                name: location.name,
                address: location.address ?? null,
            })
            .onConflict('location_type')
            .merge({
                name: location.name,
                address: location.address ?? null,
            });
    }
}

class KnexTimesConnection implements TimesConnection {
    constructor(private readonly knex: Knex) {}

    async get(type: TimeType): Promise<Time> {
        const row = await this.knex('times').where('time_type', type).first();
        if (!row) return new Time(0);
        return new Time(
            Number(row.min_minutes ?? 0),
            row.max_minutes != null ? Number(row.max_minutes) : undefined,
        );
    }

    async getAll(): Promise<Record<TimeType, Time>> {
        const out = {} as Record<TimeType, Time>;
        for (const t of Object.values(TimeType)) {
            out[t] = await this.get(t);
        }
        return out;
    }

    async set(type: TimeType, time: Time): Promise<void> {
        await this.knex('times')
            .insert({
                time_type: type,
                min_minutes: time.min,
                max_minutes: time.max ?? null,
            })
            .onConflict('time_type')
            .merge({
                min_minutes: time.min,
                max_minutes: time.max ?? null,
            });
    }
}

class KnexMenuConnection implements MenuConnection {
    constructor(private readonly knex: Knex) {}

    async get(course: string): Promise<MenuCourse> {
        const c = await this.knex('menu_courses').where({ name: course }).first();
        if (!c) throw new DbNotFoundError('Course');
        return this.loadCourse(Number(c.id));
    }

    private async loadCourse(courseId: number): Promise<MenuCourse> {
        const c = await this.knex('menu_courses').where('id', courseId).first();
        if (!c) throw new DbNotFoundError('Course');
        const itemsRows = await this.knex('menu_items').where('course_id', courseId).orderBy('sort_order');
        const items: MenuItem[] = [];
        for (const item of itemsRows) {
            const tagRows = await this.knex('menu_item_tags').where('menu_item_id', item.id).select('tag');
            const tags = tagRows.map((r) => String(r.tag) as MenuTag);
            items.push(new MenuItem(String(item.name), tags));
        }
        return new MenuCourse(String(c.name), items);
    }

    async getAll(): Promise<MenuCourse[]> {
        const courses = await this.knex('menu_courses').orderBy('sort_order');
        const out: MenuCourse[] = [];
        for (const c of courses) {
            out.push(await this.loadCourse(Number(c.id)));
        }
        return out;
    }

    async createCourse(course: string): Promise<void> {
        const exists = await this.knex('menu_courses').where({ name: course }).first();
        if (exists) throw new DbError('Course already exists');
        const last = await this.knex('menu_courses').orderBy('sort_order', 'desc').select('sort_order').first();
        const nextSort = last != null ? Number(last.sort_order) + 1 : 0;
        await this.knex('menu_courses').insert({ name: course, sort_order: nextSort });
    }

    async removeCourse(course: string): Promise<void> {
        await this.knex('menu_courses').where({ name: course }).delete();
    }

    async updateCourse(course: string, items: MenuItem[]): Promise<void> {
        const courseRow = await this.knex('menu_courses').where({ name: course }).first();
        if (!courseRow) throw new DbNotFoundError('Course');
        const courseId = Number(courseRow.id);
        await this.knex.transaction(async (trx) => {
            await trx('menu_items').where('course_id', courseId).delete();
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const ins = await trx('menu_items')
                    .insert({
                        course_id: courseId,
                        name: item.name,
                        sort_order: i,
                    })
                    .returning('id');
                const itemId = insertReturningId(ins);
                for (const tag of item.tags) {
                    await trx('menu_item_tags').insert({ menu_item_id: itemId, tag: String(tag) });
                }
            }
        });
    }
}

class KnexProjectorConnection implements ProjectorConnection {
    constructor(private readonly knex: Knex) {}

    async get(): Promise<Projector> {
        const row = await this.knex('projector').where('id', SINGLETON_ID).first();
        if (!row) {
            return new Projector('home', '', 30_000, false);
        }
        return new Projector(
            row.mode as ProjectorMode,
            String(row.message ?? ''),
            Number(row.dwell_ms ?? 30_000),
            toBool(row.paused),
        );
    }

    async setMode(mode: ProjectorMode): Promise<void> {
        await this.knex('projector').where('id', SINGLETON_ID).update({ mode });
    }

    async setMessage(message: string): Promise<void> {
        await this.knex('projector').where('id', SINGLETON_ID).update({ message });
    }

    async setDwellMs(dwellMs: number): Promise<void> {
        await this.knex('projector').where('id', SINGLETON_ID).update({ dwell_ms: dwellMs });
    }

    async setPaused(paused: boolean): Promise<void> {
        await this.knex('projector').where('id', SINGLETON_ID).update({ paused });
    }

    async getGuestbookEntryIds(): Promise<string[]> {
        const rows = await this.knex('guestbook_entries')
            .where({ visible: true })
            .where({ moderated: false })
            .select('id');
        return rows.map((r) => String(r.id));
    }
}

class KnexFerryServiceConnection implements FerryServiceConnection {
    constructor(private readonly knex: Knex) {}

    async getAll(to: FerryServiceTo): Promise<FerryService[]> {
        const rows = await this.knex('ferry_services').where('to_target', to).orderBy('time');
        return rows.map(
            (r) =>
                new FerryService(
                    r.to_target as FerryServiceTo,
                    String(r.platform),
                    String(r.time),
                    String(r.via),
                    String(r.arriving),
                ),
        );
    }

    async replaceAll(services: FerryService[]): Promise<void> {
        await this.knex.transaction(async (trx) => {
            await trx('ferry_services').delete();
            for (const s of services) {
                await trx('ferry_services').insert({
                    id: crypto.randomUUID(),
                    to_target: s.to,
                    platform: s.platform,
                    time: s.time,
                    via: s.via,
                    arriving: s.arriving,
                });
            }
        });
    }

    async getLink(): Promise<string> {
        const row = await this.knex('ferry_meta').where('id', SINGLETON_ID).first();
        return row ? String(row.link ?? '') : '';
    }

    async setLink(link: string): Promise<void> {
        await this.knex('ferry_meta').where('id', SINGLETON_ID).update({ link });
    }

    async getCost(): Promise<string> {
        const row = await this.knex('ferry_meta').where('id', SINGLETON_ID).first();
        return row ? String(row.cost ?? '') : '';
    }

    async setCost(cost: string): Promise<void> {
        await this.knex('ferry_meta').where('id', SINGLETON_ID).update({ cost });
    }
}

class KnexNamesConnection implements NamesConnection {
    constructor(private readonly knex: Knex) {}

    async getNames(): Promise<string> {
        const row = await this.knex('names').where('id', SINGLETON_ID).first();
        return row ? String(row.names ?? '') : '';
    }

    async setNames(names: string): Promise<void> {
        await this.knex('names').where('id', SINGLETON_ID).update({ names });
    }

    async getNamesShort(): Promise<string> {
        const row = await this.knex('names').where('id', SINGLETON_ID).first();
        return row ? String(row.names_short ?? '') : '';
    }

    async setNamesShort(namesShort: string): Promise<void> {
        await this.knex('names').where('id', SINGLETON_ID).update({ names_short: namesShort });
    }

    async getContactName(): Promise<string> {
        const row = await this.knex('names').where('id', SINGLETON_ID).first();
        return row ? String(row.contact_name ?? '') : '';
    }

    async setContactName(contactName: string): Promise<void> {
        await this.knex('names').where('id', SINGLETON_ID).update({ contact_name: contactName });
    }

    async getContactPhone(): Promise<string> {
        const row = await this.knex('names').where('id', SINGLETON_ID).first();
        return row ? String(row.contact_phone ?? '') : '';
    }

    async setContactPhone(contactPhone: string): Promise<void> {
        await this.knex('names').where('id', SINGLETON_ID).update({ contact_phone: contactPhone });
    }

    async getContactEmail(): Promise<string> {
        const row = await this.knex('names').where('id', SINGLETON_ID).first();
        return row ? String(row.contact_email ?? '') : '';
    }

    async setContactEmail(contactEmail: string): Promise<void> {
        await this.knex('names').where('id', SINGLETON_ID).update({ contact_email: contactEmail });
    }
}

class KnexScheduleConnection implements ScheduleConnection {
    constructor(private readonly knex: Knex) {}

    async get(): Promise<ScheduleSnapshot> {
        const row = await this.knex('schedule').where('id', SINGLETON_ID).first();
        if (!row) return DEFAULT_SCHEDULE_SNAPSHOT;
        try {
            const parsed = JSON.parse(String(row.snapshot_json)) as {
                events: Array<{ name: string; time: string }>;
                arrivalIndex: number;
                ceremonyIndex: number;
                receptionIndex: number;
                endOfDayIndex: number;
            };
            const events = parsed.events.map((e) => new ScheduledEvent(e.name, e.time));
            return new ScheduleSnapshot(
                events,
                parsed.arrivalIndex,
                parsed.ceremonyIndex,
                parsed.receptionIndex,
                parsed.endOfDayIndex,
            );
        } catch {
            return DEFAULT_SCHEDULE_SNAPSHOT;
        }
    }

    async set(snapshot: ScheduleSnapshot): Promise<void> {
        const json = JSON.stringify({
            events: snapshot.events.map((e) => ({ name: e.name, time: e.time })),
            arrivalIndex: snapshot.arrivalIndex,
            ceremonyIndex: snapshot.ceremonyIndex,
            receptionIndex: snapshot.receptionIndex,
            endOfDayIndex: snapshot.endOfDayIndex,
        });
        await this.knex('schedule').where('id', SINGLETON_ID).update({ snapshot_json: json });
    }

    async getDate(): Promise<string> {
        const row = await this.knex('schedule').where('id', SINGLETON_ID).first();
        return row ? String(row.event_date ?? '') : formatYYYYMMDD(new Date());
    }

    async setDate(date: string): Promise<void> {
        await this.knex('schedule').where('id', SINGLETON_ID).update({ event_date: date });
    }
}

function maxSortKeyFromAggregateRow(row: Record<string, unknown> | undefined): number {
    if (!row || typeof row !== 'object') return 0;
    const v = Object.values(row)[0];
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

class KnexFaqConnection implements FaqConnection {
    constructor(private readonly knex: Knex) {}

    async getAll(): Promise<Faq[]> {
        const rows = await this.knex('faq').orderBy('sort_key');
        return rows.map((r) => new Faq(String(r.id), String(r.question), String(r.answer), Number(r.sort_key)));
    }

    async get(id: string): Promise<Faq> {
        const row = await this.knex('faq').where('id', id).first();
        if (!row) throw new DbNotFoundError('FAQ');
        return new Faq(String(row.id), String(row.question), String(row.answer), Number(row.sort_key));
    }

    async create(question: string, answer: string): Promise<Faq> {
        const id = crypto.randomUUID();
        // Knex + SQLite often aliases MAX(sort_key) as e.g. `max(`sort_key`)`, not `.max` — read first column.
        const agg = await this.knex('faq').max('sort_key').first();
        const maxSort = maxSortKeyFromAggregateRow(agg as Record<string, unknown> | undefined);
        await this.knex('faq').insert({ id, question, answer, sort_key: maxSort + 1 });
        return this.get(id);
    }

    async update(id: string, question: string, answer: string): Promise<void> {
        const n = await this.knex('faq').where('id', id).update({ question, answer });
        if (n === 0) throw new DbNotFoundError('FAQ');
    }

    async delete(id: string): Promise<void> {

        const existing = await this.get(id);
        if (!existing) throw new DbNotFoundError('FAQ');

        await this.knex('faq').where('sort_key', '>', existing.sortKey).update({ sort_key: this.knex.raw('sort_key - 1') });
        await this.knex('faq').where('id', id).delete();
    }
    
    async move(id: string, direction: 'up' | 'down'): Promise<void> {
        const faq = await this.get(id);
        const previous = await this.knex('faq').where('sort_key', faq.sortKey - (direction === 'up' ? 1 : -1)).first();
        if (!previous) throw new DbNotFoundError('FAQ');
        await this.knex('faq').where('id', id).update({ sort_key: previous.sort_key });
        await this.knex('faq').where('id', previous.id).update({ sort_key: faq.sortKey });
    }
}

export class KnexConnectionSupplier implements ConnectionSupplier {
    protected knex: Knex;
    protected readonly initialConfig: Knex.Config;

    constructor(config: Knex.Config) {
        this.initialConfig = config;
        this.knex = knex(config);
    }

    async prepare(): Promise<void> {
        await ensureKnexSchema(this.knex);
        await ensureSingletonDefaults(this.knex);
    }

    getInviteConnection(): InviteConnection {
        return new KnexInviteConnection(this.knex);
    }

    getAuthorConnection(): AuthorConnection {
        return new KnexAuthorConnection(this.knex);
    }

    getGuestbookConnection(): GuestbookConnection {
        return new KnexGuestbookConnection(this.knex);
    }

    getPhotoConnection(): PhotoConnection {
        return new KnexPhotoConnection(this.knex);
    }

    getInviteeConnection(): InviteeConnection {
        return new KnexInviteeConnection(this.knex);
    }

    getProjectorConnection(): ProjectorConnection {
        return new KnexProjectorConnection(this.knex);
    }

    getFerryServiceConnection(): FerryServiceConnection {
        return new KnexFerryServiceConnection(this.knex);
    }

    getNamesConnection(): NamesConnection {
        return new KnexNamesConnection(this.knex);
    }

    getScheduleConnection(): ScheduleConnection {
        return new KnexScheduleConnection(this.knex);
    }

    getLocationConnection(): LocationConnection {
        return new KnexLocationConnection(this.knex);
    }

    getTimesConnection(): TimesConnection {
        return new KnexTimesConnection(this.knex);
    }

    getMenuConnection(): MenuConnection {
        return new KnexMenuConnection(this.knex);
    }

    getFaqConnection(): FaqConnection {
        return new KnexFaqConnection(this.knex);
    }
}

export class PgConnectionSupplier extends KnexConnectionSupplier {
    constructor() {
        super({
            client: 'pg',
            connection: process.env.DATABASE_URL!,
            pool: { min: 0, max: 10 },
        });
    }
}

export class SqliteConnectionSupplier extends KnexConnectionSupplier {
    clear: boolean = false;
    private readonly sqliteFilename: string;

    constructor(clear?: boolean) {
        const filename = path.resolve(
            process.cwd(),
            process.env.DATABASE_URL ?? './database/db.sqlite3',
        );
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        super({
            client: 'better-sqlite3',
            connection: { filename },
            useNullAsDefault: true,
        });
        this.sqliteFilename = filename;
        this.clear = clear ?? false;
    }

    async prepare(): Promise<void> {
        if (this.clear) {
            await this.knex.destroy();
            await fs.promises.rm(this.sqliteFilename, { force: true });
            await fs.promises.mkdir(path.dirname(this.sqliteFilename), { recursive: true });
            this.knex = knex(this.initialConfig);
        }
        await super.prepare();
    }
}

/** Knex recommends `hasTable` + `createTable` over `createTableIfNotExists` for new code. */
async function ensureTable(
    knex: Knex,
    tableName: string,
    build: (t: Knex.CreateTableBuilder) => void,
): Promise<void> {
    if (await knex.schema.hasTable(tableName)) return;
    await knex.schema.createTable(tableName, build);
}

async function sqliteTableColumns(knex: Knex, table: string): Promise<{ name: string; type: string }[]> {
    const r = await knex.raw(`PRAGMA table_info(${table})`);
    if (Array.isArray(r)) return r as { name: string; type: string }[];
    if (r && typeof r === 'object' && 'rows' in r && Array.isArray((r as { rows: unknown }).rows)) {
        return (r as { rows: { name: string; type: string }[] }).rows;
    }
    return [];
}

async function faqTableUsesIntegerId(knex: Knex): Promise<boolean> {
    const client = knex.client.config.client;
    if (client === 'better-sqlite3' || client === 'sqlite3') {
        const cols = await sqliteTableColumns(knex, 'faq');
        const idCol = cols.find((c) => c.name === 'id');
        if (!idCol) return false;
        return /INT/i.test(idCol.type);
    }
    if (client === 'pg') {
        const row = await knex('information_schema.columns')
            .select('data_type')
            .where({ table_schema: 'public', table_name: 'faq', column_name: 'id' })
            .first();
        if (!row) return false;
        const t = String((row as { data_type: string }).data_type).toLowerCase();
        return t === 'integer' || t === 'bigint' || t === 'smallint';
    }
    return false;
}

async function ensureKnexSchema(knex: Knex): Promise<void> {
    const c = knex.client.config.client;
    const isSqlite = c === 'better-sqlite3' || c === 'sqlite3';
    if (isSqlite) {
        await knex.raw('PRAGMA foreign_keys = ON');
    }

    await ensureTable(knex, 'authors', (t) => {
        t.string('id', 36).primary();
    });

    await ensureTable(knex, 'invites', (t) => {
        t.string('id', 16).primary();
        t.string('name').notNullable();
        t.string('phone');
        t.string('email');
        t.text('notes');
        t.boolean('responded').notNullable().defaultTo(false);
        t.boolean('seen').notNullable().defaultTo(false);
        t.boolean('carpool_requested').notNullable().defaultTo(false);
        t.integer('carpool_spots_offered').notNullable().defaultTo(0);
    });

    await ensureTable(knex, 'invitees', (t) => {
        t.string('id', 36).primary();
        t.string('invite_id', 16)
            .nullable()
            .references('id')
            .inTable('invites')
            .onDelete('CASCADE');
        t.string('name').notNullable();
        t.boolean('attending');
        t.text('dietary_restrictions');
    });

    await ensureTable(knex, 'photos', (t) => {
        t.string('id', 36).primary();
        t.string('name').notNullable();
        t.string('mime_type').notNullable();
        t.timestamp('created').notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated').notNullable().defaultTo(knex.fn.now());
        t.integer('sort_key').notNullable().defaultTo(0);
        t.string('type', 32).notNullable();
        t.text('caption_or_style');
    });

    await ensureTable(knex, 'guestbook_entries', (t) => {
        t.string('id', 36).primary();
        t.string('author_id', 36)
            .notNullable()
            .references('id')
            .inTable('authors')
            .onDelete('CASCADE');
        t.boolean('visible').notNullable();
        t.timestamp('created').notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated').notNullable().defaultTo(knex.fn.now());
        t.text('content');
        t.string('display_name');
        t.string('photo_id', 36).references('id').inTable('photos').onDelete('SET NULL');
        t.boolean('moderated').notNullable().defaultTo(false);
        t.text('moderation_reason');
        t.boolean('pending_remoderation').notNullable().defaultTo(false);
    });

    await ensureTable(knex, 'projector', (t) => {
        t.string('id', 8).primary();
        t.string('mode', 32).notNullable();
        t.text('message').notNullable().defaultTo('');
        t.integer('dwell_ms').notNullable();
        t.boolean('paused').notNullable().defaultTo(false);
    });

    await ensureTable(knex, 'ferry_meta', (t) => {
        t.string('id', 8).primary();
        t.text('link').notNullable().defaultTo('');
        t.text('cost').notNullable().defaultTo('');
    });

    await ensureTable(knex, 'ferry_services', (t) => {
        t.string('id', 36).primary();
        t.string('to_target', 16).notNullable();
        t.string('platform').notNullable();
        t.string('time').notNullable();
        t.string('via').notNullable();
        t.string('arriving').notNullable();
    });

    await ensureTable(knex, 'names', (t) => {
        t.string('id', 8).primary();
        t.text('names').notNullable().defaultTo('');
        t.text('names_short').notNullable().defaultTo('');
        t.text('contact_name').notNullable().defaultTo('');
        t.text('contact_phone').notNullable().defaultTo('');
        t.text('contact_email').notNullable().defaultTo('');
    });

    await ensureTable(knex, 'schedule', (t) => {
        t.string('id', 8).primary();
        t.string('event_date').notNullable();
        t.text('snapshot_json').notNullable();
    });

    await ensureTable(knex, 'locations', (t) => {
        t.string('location_type', 64).primary();
        t.string('name').notNullable().defaultTo('');
        t.text('address');
    });

    await ensureTable(knex, 'times', (t) => {
        t.string('time_type', 64).primary();
        t.integer('min_minutes').notNullable();
        t.integer('max_minutes');
    });

    await ensureTable(knex, 'menu_courses', (t) => {
        t.increments('id').primary();
        t.string('name').notNullable().unique();
        t.integer('sort_order').notNullable().defaultTo(0);
    });

    await ensureTable(knex, 'menu_items', (t) => {
        t.increments('id').primary();
        t.integer('course_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('menu_courses')
            .onDelete('CASCADE');
        t.string('name').notNullable();
        t.integer('sort_order').notNullable().defaultTo(0);
    });

    await ensureTable(knex, 'menu_item_tags', (t) => {
        t.integer('menu_item_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('menu_items')
            .onDelete('CASCADE');
        t.string('tag', 64).notNullable();
        t.primary(['menu_item_id', 'tag']);
    });

    await knex.schema.createTable('faq', (t) => {
        t.string('id', 36).primary();
        t.string('question').notNullable();
        t.text('answer').notNullable();
        t.integer('sort_key').notNullable().defaultTo(0);
    });
}

async function ensureSingletonDefaults(knex: Knex): Promise<void> {
    const today = formatYYYYMMDD(new Date());
    const snapshotJson = JSON.stringify({
        events: DEFAULT_SCHEDULE_SNAPSHOT.events.map((e) => ({ name: e.name, time: e.time })),
        arrivalIndex: DEFAULT_SCHEDULE_SNAPSHOT.arrivalIndex,
        ceremonyIndex: DEFAULT_SCHEDULE_SNAPSHOT.ceremonyIndex,
        receptionIndex: DEFAULT_SCHEDULE_SNAPSHOT.receptionIndex,
        endOfDayIndex: DEFAULT_SCHEDULE_SNAPSHOT.endOfDayIndex,
    });
    await knex('projector')
        .insert({
            id: SINGLETON_ID,
            mode: 'home',
            message: '',
            dwell_ms: 30_000,
            paused: false,
        })
        .onConflict('id')
        .ignore();
    await knex('ferry_meta')
        .insert({ id: SINGLETON_ID, link: '', cost: '' })
        .onConflict('id')
        .ignore();
    await knex('names')
        .insert({
            id: SINGLETON_ID,
            names: '',
            names_short: '',
            contact_name: '',
            contact_phone: '',
        })
        .onConflict('id')
        .ignore();
    await knex('schedule')
        .insert({
            id: SINGLETON_ID,
            event_date: today,
            snapshot_json: snapshotJson,
        })
        .onConflict('id')
        .ignore();
}

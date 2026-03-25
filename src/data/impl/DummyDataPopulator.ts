import fs from 'fs';
import path from 'path';

import { Invitee } from '../def/types/Invitee';
import { Photo } from '../def/types/Photo';
import { FerryService, FerryServiceTo } from '../def/types/FerryService';
import { heroFocusYToCaptionOrStyle } from '../../util/heroPhotoStyle';
import { DataPopulator } from '../def/interfaces/DataPopulator';
import { DataConnection } from '../def/DataConnection';
import { ScheduledEvent, ScheduleSnapshot } from '../def/types/ScheduledEvent';
import { Location, LocationType } from '../def/types/Location';
import { Time, TimeType } from '../def/types/Time';
import { MenuItem, MenuTag } from '../def/types/MenuItem';
import { evaluateGuestbookAutomoderation, formatAutomoderationReason } from '../../util/guestbookAutomoderation';

type InviteSeedJson = {
    name: string;
    guests: Array<{ name: string; attending?: boolean; dietaryRestrictions?: string }>;
    seen?: boolean;
    responded?: boolean;
    notes?: string;
    phone?: string;
    email?: string;
    carpoolRequested?: boolean;
    carpoolSpotsOffered?: number;
};

type GuestbookSeedJson = {
    displayName?: string;
    content?: string;
    visible: boolean;
    daysAgo: number;
    /** If true and the resolved `dummy-photos` dir has image files, attach a random one. */
    attachDummyPhoto?: boolean;
};

type FerryTimetableJson = {
    services: Array<{
        to: FerryServiceTo;
        platform: string;
        time: string;
        via: string;
        arriving: string;
    }>;
    link: string;
    cost: string;
};

type MenuItemJson = {
    name: string;
    tags: Array<string>;
}

type MenuCourseJson = {
    name: string;
    items: Array<MenuItemJson>;
}

type MenuJson = {
    courses: Array<MenuCourseJson>;
}

type NamesJson = {
    names: string;
    namesShort: string;
    contactName: string;
    contactPhone: string;
};

type ScheduleJson = {
    /** Optional `YYYY-MM-DD`; when present, seeds `schedule.setDate`. */
    date?: string;
    arrival: number;
    ceremony: number;
    reception: number;
    endOfDay: number;
    events: Array<{ name: string; time: string }>;
};

/** Each present key in JSON must include `name` (string); `address` is optional. */
type LocationsJsonRow = { name: string; address?: string };
type TimesJsonRow = { min: number; max?: number };

function getDummyDataFileOrDir(filename: string): string {
    const filePath = path.join(process.cwd(), 'dummyData', 'identifying', filename);
    if (fs.existsSync(filePath)) return filePath;
    return path.join(process.cwd(), 'dummyData', 'example', filename);
}

/** Project-relative path with forward slashes, for logs and thrown errors. */
function dummyDataPathForLog(absPath: string): string {
    return path.relative(process.cwd(), absPath).split(path.sep).join('/');
}

export class DummyDataPopulator implements DataPopulator {
    private static readonly dummyPhotosSourceDir = path.join(getDummyDataFileOrDir('dummy-photos'));
    private static readonly heroImagesSourceDir = path.join(getDummyDataFileOrDir('hero-images'));
    private static readonly invitesJsonPath = path.join(getDummyDataFileOrDir('invites.json'));
    private static readonly guestbookJsonPath = path.join(getDummyDataFileOrDir('guestbook.json'));
    private static readonly ferryTimetableJsonPath = path.join(getDummyDataFileOrDir('ferryTimetable.json'));
    private static readonly namesJsonPath = path.join(getDummyDataFileOrDir('names.json'));
    private static readonly scheduleJsonPath = path.join(getDummyDataFileOrDir('schedule.json'));
    private static readonly locationsJsonPath = path.join(getDummyDataFileOrDir('locations.json'));
    private static readonly timesJsonPath = path.join(getDummyDataFileOrDir('times.json'));
    private static readonly menuJsonPath = path.join(getDummyDataFileOrDir('menu.json'));
    private static readonly dummyPhotoFilenameRe = /\.(jpe?g|png|gif|webp)$/i;
    private static readonly professionalDummyPhotoMax = 5;

    async populate(connection: DataConnection): Promise<void> {
        await this.createInvites(connection);
        await this.loadFerryTimetable(connection);
        await this.createHeroPhotosFromHeroImagesDir(connection);
        await this.createProfessionalPhotosFromDummyPhotosDir(connection);
        await this.createGuestbookEntries(connection);
        await this.loadNames(connection);
        await this.loadSchedule(connection);
        await this.loadLocations(connection);
        await this.loadTimes(connection);
        await this.loadMenu(connection);
    }

    async loadMenu(connection: DataConnection): Promise<void> {
        const data = await DummyDataPopulator.readMenuJson();
        if (!data) return;
        for (const course of data.courses) {
            await connection.menu.createCourse(course.name);
            const items = course.items.map((item: MenuItemJson) => new MenuItem(item.name, item.tags as MenuTag[]));
            await connection.menu.updateCourse(course.name, items);
        }
    }

    async loadTimes(connection: DataConnection): Promise<void> {
        const data = await DummyDataPopulator.readTimesJson();
        if (!data) return;
        const validTypes = new Set<TimeType>(Object.values(TimeType));
        for (const key of Object.keys(data)) {
            if (!validTypes.has(key as TimeType)) {
                throw new Error(
                    `Unknown time key "${key}" in ${dummyDataPathForLog(DummyDataPopulator.timesJsonPath)}`,
                );
            }
        }
        for (const type of Object.values(TimeType)) {
            const raw = data[type];
            let min: number = 0;
            let max: number | undefined = undefined;
            if (raw !== undefined) {
                if (typeof raw !== 'object' || raw === null || typeof (raw as TimesJsonRow).min !== 'number') {
                    throw new Error(
                        `${dummyDataPathForLog(DummyDataPopulator.timesJsonPath)}: "${type}" must be an object with a number "min"`,
                    );
                }
                const entry = raw as TimesJsonRow;
                min = entry.min;
                max = entry.max;
            }
            await connection.times.set(type, new Time(min, max));
        }   
    }

    async loadNames(connection: DataConnection): Promise<void> {
        const names = await DummyDataPopulator.readNamesJson();
        await connection.names.setNames(names.names);
        await connection.names.setNamesShort(names.namesShort);
        await connection.names.setContactName(names.contactName);
        await connection.names.setContactPhone(names.contactPhone);
    }

    async loadLocations(connection: DataConnection): Promise<void> {
        const data = await DummyDataPopulator.readLocationsJson();
        if (!data) return;
        const validTypes = new Set<LocationType>(Object.values(LocationType));
        for (const key of Object.keys(data)) {
            if (!validTypes.has(key as LocationType)) {
                throw new Error(
                    `Unknown location key "${key}" in ${dummyDataPathForLog(DummyDataPopulator.locationsJsonPath)}`,
                );
            }
        }
        for (const type of Object.values(LocationType)) {
            const raw = data[type];
            let name = '';
            let address: string | undefined;
            if (raw !== undefined) {
                if (typeof raw !== 'object' || raw === null || typeof (raw as LocationsJsonRow).name !== 'string') {
                    throw new Error(
                        `${dummyDataPathForLog(DummyDataPopulator.locationsJsonPath)}: "${type}" must be an object with a string "name"`,
                    );
                }
                const entry = raw as LocationsJsonRow;
                name = entry.name.trim();
                address =
                    typeof entry.address === 'string' && entry.address.trim()
                        ? entry.address.trim()
                        : undefined;
            }
            await connection.locations.set(type, new Location(name, address));
        }
    }

    async loadSchedule(connection: DataConnection): Promise<void> {
        const data = await DummyDataPopulator.readScheduleJson();
        if (!data) return;
        const events = data.events.map((e) => new ScheduledEvent(e.name.trim(), e.time.trim()));
        if (events.length === 0) {
            throw new Error(
                `${dummyDataPathForLog(DummyDataPopulator.scheduleJsonPath)} must include at least one event`,
            );
        }
        const max = events.length - 1;
        const { arrival, ceremony, reception, endOfDay } = data;
        if (
            arrival < 0 ||
            arrival > max ||
            ceremony < 0 ||
            ceremony > max ||
            reception < 0 ||
            reception > max ||
            endOfDay < 0 ||
            endOfDay > max
        ) {
            throw new Error(
                `${dummyDataPathForLog(DummyDataPopulator.scheduleJsonPath)}: arrival, ceremony, reception, and endOfDay must be indices from 0 to ${max}`,
            );
        }
        const snapshot: ScheduleSnapshot = new ScheduleSnapshot(events, arrival, ceremony, reception, endOfDay);
        await connection.schedule.set(snapshot);
        const dateStr = typeof data.date === 'string' ? data.date.trim() : '';
        if (dateStr) {
            await connection.schedule.setDate(dateStr);
        }
    }

    private static handleNotFound(err: unknown, path: string, type: string): null {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
            if (process.env.NODE_ENV === 'development') {
                console.warn(
                    `[DummyData] ${dummyDataPathForLog(path)} not found; skipping ${type}.`,
                );
            }
            return null;
        }
        throw err;
    }

    private static async readMenuJson(): Promise<MenuJson | null> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.menuJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as MenuJson).courses)) {
                throw new Error(`${dummyDataPathForLog(DummyDataPopulator.menuJsonPath)} must contain a { courses: [...] } object`);
            }
            return parsed as MenuJson;
        }
        catch (err) {
            return DummyDataPopulator.handleNotFound(err, DummyDataPopulator.menuJsonPath, 'menu');
        }
    }

    private static async readScheduleJson(): Promise<ScheduleJson | null> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.scheduleJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object') {
                throw new Error(`${dummyDataPathForLog(DummyDataPopulator.scheduleJsonPath)} must contain a JSON object`);
            }
            const o = parsed as Record<string, unknown>;
            if (
                !Array.isArray(o.events) ||
                typeof o.arrival !== 'number' ||
                typeof o.ceremony !== 'number' ||
                typeof o.reception !== 'number' ||
                typeof o.endOfDay !== 'number'
            ) {
                throw new Error(
                    `${dummyDataPathForLog(DummyDataPopulator.scheduleJsonPath)} must contain arrival, ceremony, reception, endOfDay (numbers) and events (array)`,
                );
            }
            return parsed as ScheduleJson;
        } catch (err) {
            return DummyDataPopulator.handleNotFound(err, DummyDataPopulator.scheduleJsonPath, 'schedule');
        }
    }

    private static async readNamesJson(): Promise<NamesJson> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.namesJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object') {
                throw new Error(`${dummyDataPathForLog(DummyDataPopulator.namesJsonPath)} must contain a JSON object`);
            }
            return parsed as NamesJson;
        } catch (err) {
            DummyDataPopulator.handleNotFound(err, DummyDataPopulator.namesJsonPath, 'names');
            return { names: '', namesShort: '', contactName: '', contactPhone: '' };
        }
    }

    private static async readTimesJson(): Promise<Partial<Record<TimeType, TimesJsonRow>> | null> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.timesJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(
                    `${dummyDataPathForLog(DummyDataPopulator.timesJsonPath)} must contain a JSON object`,
                );
            }
            return parsed as Partial<Record<TimeType, TimesJsonRow>>;
        } catch (err) {
            return DummyDataPopulator.handleNotFound(err, DummyDataPopulator.timesJsonPath, 'times');
        }
    }

    private static async readLocationsJson(): Promise<Partial<Record<LocationType, LocationsJsonRow>> | null> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.locationsJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(
                    `${dummyDataPathForLog(DummyDataPopulator.locationsJsonPath)} must contain a JSON object`,
                );
            }
            return parsed as Partial<Record<LocationType, LocationsJsonRow>>;
        } catch (err) {
            return DummyDataPopulator.handleNotFound(err, DummyDataPopulator.locationsJsonPath, 'locations');
        }
    }

    /**
     * Seed `hero` photos from the resolved `hero-images` directory (`dummyData/identifying/…` or `dummyData/example/…`), sorted by path.
     * Filenames like `hero-2.15.jpg` set vertical focus (15 → `object-position: 50% 15%`), matching the old filename hint convention.
     */
    async createHeroPhotosFromHeroImagesDir(db: DataConnection): Promise<void> {
        const paths = await DummyDataPopulator.listSortedHeroImagePaths();
        for (const filePath of paths) {
            const data = await fs.promises.readFile(filePath);
            const name = path.basename(filePath);
            const captionOrStyle = DummyDataPopulator.captionOrStyleFromHeroSeedFilename(name);
            await db.photos.create(
                name,
                DummyDataPopulator.imageMimeTypeForPath(filePath),
                data,
                'hero',
                captionOrStyle,
            );
        }
    }

    private static async listSortedHeroImagePaths(): Promise<string[]> {
        try {
            const entries = await fs.promises.readdir(DummyDataPopulator.heroImagesSourceDir, {
                withFileTypes: true,
            });
            return entries
                .filter((e) => e.isFile() && DummyDataPopulator.dummyPhotoFilenameRe.test(e.name))
                .map((e) => path.join(DummyDataPopulator.heroImagesSourceDir, e.name))
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        } catch {
            return [];
        }
    }

    /** `hero-N.YY.ext` → vertical focus YY% (YY two or more digits); otherwise undefined. */
    private static captionOrStyleFromHeroSeedFilename(filename: string): string | undefined {
        const m = filename.match(/^hero-\d+\.(\d+)\./i);
        if (!m) return undefined;
        const yPct = Number(m[1]);
        if (!Number.isFinite(yPct) || yPct < 0 || yPct > 100) return undefined;
        return heroFocusYToCaptionOrStyle(yPct / 100);
    }

    /**
     * Seed a few `professional` photos from the resolved `dummy-photos` directory (first files when sorted by path).
     */
    async createProfessionalPhotosFromDummyPhotosDir(db: DataConnection): Promise<void> {
        const paths = await DummyDataPopulator.listSortedDummyPhotoPaths();
        const n = Math.min(DummyDataPopulator.professionalDummyPhotoMax, paths.length);
        const captions = [
            'Wedding day portrait',
            'Ceremony details',
            'Celebration',
            'First dance',
            'With family',
        ];
        for (let i = 0; i < n; i++) {
            const filePath = paths[i];
            const data = await fs.promises.readFile(filePath);
            const name = path.basename(filePath);
            await db.photos.create(
                name,
                DummyDataPopulator.imageMimeTypeForPath(filePath),
                data,
                'professional',
                captions[i % captions.length],
            );
        }
    }

    private static async listSortedDummyPhotoPaths(): Promise<string[]> {
        try {
            const entries = await fs.promises.readdir(DummyDataPopulator.dummyPhotosSourceDir, {
                withFileTypes: true,
            });
            return entries
                .filter((e) => e.isFile() && DummyDataPopulator.dummyPhotoFilenameRe.test(e.name))
                .map((e) => path.join(DummyDataPopulator.dummyPhotosSourceDir, e.name))
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

    private static async readInviteSeeds(): Promise<InviteSeedJson[]> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.invitesJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                throw new Error(`${dummyDataPathForLog(DummyDataPopulator.invitesJsonPath)} must contain a JSON array`);
            }
            return parsed as InviteSeedJson[];
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(
                        `[DummyData] ${dummyDataPathForLog(DummyDataPopulator.invitesJsonPath)} not found; skipping invite seeds.`,
                    );
                }
                return [];
            }
            throw err;
        }
    }

    private static async readGuestbookSeeds(): Promise<GuestbookSeedJson[]> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.guestbookJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                throw new Error(`${dummyDataPathForLog(DummyDataPopulator.guestbookJsonPath)} must contain a JSON array`);
            }
            return parsed as GuestbookSeedJson[];
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(
                        `[DummyData] ${dummyDataPathForLog(DummyDataPopulator.guestbookJsonPath)} not found; skipping guestbook seeds.`,
                    );
                }
                return [];
            }
            throw err;
        }
    }

    private static async readFerryTimetableJson(): Promise<FerryTimetableJson | null> {
        try {
            const raw = await fs.promises.readFile(DummyDataPopulator.ferryTimetableJsonPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (
                !parsed ||
                typeof parsed !== 'object' ||
                !Array.isArray((parsed as FerryTimetableJson).services)
            ) {
                throw new Error(
                    `${dummyDataPathForLog(DummyDataPopulator.ferryTimetableJsonPath)} must contain a { services: [...] } object`,
                );
            }
            return parsed as FerryTimetableJson;
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(
                        `[DummyData] ${dummyDataPathForLog(DummyDataPopulator.ferryTimetableJsonPath)} not found; skipping ferry timetable.`,
                    );
                }
                return null;
            }
            throw err;
        }
    }

    async loadFerryTimetable(db: DataConnection): Promise<void> {
        const data = await DummyDataPopulator.readFerryTimetableJson();
        if (!data) return;
        const services: FerryService[] = data.services.map((row) => {
            if (!row.time?.match(/^\d{2}:\d{2}$/)) {
                throw new Error(
                    `Invalid ferry timetable time in ${dummyDataPathForLog(DummyDataPopulator.ferryTimetableJsonPath)}`,
                );
            }
            if (!row.arriving?.match(/^\d{2}:\d{2}$/)) {
                throw new Error(
                    `Invalid ferry timetable arriving time in ${dummyDataPathForLog(DummyDataPopulator.ferryTimetableJsonPath)}`,
                );
            }
            return new FerryService(row.to, row.platform, row.time, row.via, row.arriving);
        });
        await db.ferryServices.replaceAll(services);
        await db.ferryServices.setLink(data.link.trim());
        await db.ferryServices.setCost(data.cost.trim());
    }

    async createInvites(db: DataConnection): Promise<void> {
        const inviteSeeds = await DummyDataPopulator.readInviteSeeds();
        for (const row of inviteSeeds) {
            const invitees: Invitee[] = [];
            for (const g of row.guests) {
                invitees.push(
                    await db.invitees.create(g.name, g.attending, g.dietaryRestrictions),
                );
            }
            const invite = await db.invites.create(row.name, invitees);
            await db.invites.updateStatus(
                invite.id,
                row.seen !== undefined ? row.seen : false,
                row.responded !== undefined ? row.responded : false,
            );
            await db.invites.update(
                invite.id,
                row.phone,
                row.email,
                row.notes,
                row.carpoolRequested === true,
                row.carpoolSpotsOffered !== undefined ? row.carpoolSpotsOffered : 0,
            );
        }
    }

    async createGuestbookEntries(db: DataConnection): Promise<void> {
        const dummyPhotoPaths = await DummyDataPopulator.listSortedDummyPhotoPaths();
        const guestbookSeeds = await DummyDataPopulator.readGuestbookSeeds();

        for (const row of guestbookSeeds) {
            const author = await db.authors.create();
            let photo: Photo | undefined;
            if (row.attachDummyPhoto && dummyPhotoPaths.length > 0) {
                const srcPath = dummyPhotoPaths[Math.floor(Math.random() * dummyPhotoPaths.length)];
                const data = await fs.promises.readFile(srcPath);
                photo = await db.photos.create(
                    path.basename(srcPath),
                    DummyDataPopulator.imageMimeTypeForPath(srcPath),
                    data,
                );
            }
            const entry = await db.guestbook.create(
                author,
                row.visible,
                row.content,
                row.displayName,
                photo,
            );
            const created = new Date();
            created.setDate(created.getDate() - row.daysAgo);
            entry.created = created;
            entry.updated = created;

            const displayNameRaw = (typeof row.displayName === 'string' ? row.displayName : '').trim();
            const contentRaw = (typeof row.content === 'string' ? row.content : '').trim();
            const auto = evaluateGuestbookAutomoderation(displayNameRaw, contentRaw);
            if (auto.shouldModerate) {
                await db.guestbook.hide(entry.id, formatAutomoderationReason(auto.reasons), true);
            }
        }
    }
}

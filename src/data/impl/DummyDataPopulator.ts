import fs from 'fs';
import path from 'path';

import { Invitee } from '../def/types/Invitee';
import { Photo } from '../def/types/Photo';
import type { FerryService, FerryServiceTo } from '../def/types/FerryService';
import { heroFocusYToCaptionOrStyle } from '../../util/heroPhotoStyle';
import { DataPopulator } from '../def/interfaces/DataPopulator';
import { DataConnection } from '../def/DataConnection';

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
    /** If true and `dummyData/dummy-photos` has image files, attach a random one. */
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
};

export class DummyDataPopulator implements DataPopulator {
    private static readonly dummyDataDir = path.join(process.cwd(), 'dummyData');
    private static readonly dummyPhotosSourceDir = path.join(DummyDataPopulator.dummyDataDir, 'dummy-photos');
    private static readonly heroImagesSourceDir = path.join(DummyDataPopulator.dummyDataDir, 'hero-images');
    private static readonly invitesJsonPath = path.join(DummyDataPopulator.dummyDataDir, 'invites.json');
    private static readonly guestbookJsonPath = path.join(DummyDataPopulator.dummyDataDir, 'guestbook.json');
    private static readonly ferryTimetableJsonPath = path.join(DummyDataPopulator.dummyDataDir, 'ferryTimetable.json');
    private static readonly dummyPhotoFilenameRe = /\.(jpe?g|png|gif|webp)$/i;
    /** First N files from sorted `dummy-photos` are seeded as professional gallery images. */
    private static readonly professionalDummyPhotoMax = 5;

    async populate(connection: DataConnection): Promise<void> {
        await this.createInvites(connection);
        await this.loadFerryTimetable(connection);
        await this.createHeroPhotosFromHeroImagesDir(connection);
        await this.createProfessionalPhotosFromDummyPhotosDir(connection);
        await this.createGuestbookEntries(connection);
    }

    /**
     * Seed `hero` photos from `dummyData/hero-images` (sorted by path).
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
     * Seed a few `professional` photos from `dummyData/dummy-photos` (first files when sorted by path).
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
                throw new Error('dummyData/invites.json must contain a JSON array');
            }
            return parsed as InviteSeedJson[];
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[DummyData] dummyData/invites.json not found; skipping invite seeds.');
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
                throw new Error('dummyData/guestbook.json must contain a JSON array');
            }
            return parsed as GuestbookSeedJson[];
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[DummyData] dummyData/guestbook.json not found; skipping guestbook seeds.');
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
                throw new Error('dummyData/ferryTimetable.json must contain a { services: [...] } object');
            }
            return parsed as FerryTimetableJson;
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[DummyData] dummyData/ferryTimetable.json not found; skipping ferry timetable.');
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
            const time = new Date(row.time);
            const arriving = new Date(row.arriving);
            if (Number.isNaN(time.getTime()) || Number.isNaN(arriving.getTime())) {
                throw new Error('Invalid ferry timetable date in dummyData/ferryTimetable.json');
            }
            return {
                to: row.to,
                platform: row.platform,
                via: row.via,
                time,
                arriving,
            };
        });
        await db.ferryServices.replaceAll(services);
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
        }
    }
}

import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { DbError, DbNotFoundError } from '../../data/dbErrors';
import { MAX_FILE_SIZE_MB, MAX_FILES, Upload } from '../../middleware/uploadPhotos';
import {
    heroFocusYToCaptionOrStyle,
    parseHeroFocusYFromCaptionOrStyle,
} from '../../util/heroPhotoStyle';

const router = express.Router();

function parseFocusYBody(body: unknown): number | null {
    const raw = body as Record<string, unknown> | undefined;
    const rawY = raw?.focusY;
    const y =
        typeof rawY === 'string'
            ? parseFloat(rawY)
            : typeof rawY === 'number'
              ? rawY
              : NaN;
    if (!Number.isFinite(y)) return null;
    return y;
}

function wantsAsyncFocusSave(req: express.Request): boolean {
    return req.get('X-Requested-With') === 'fetch';
}

router.get('/', async (req, res, next) => {
    try {
        const heroPhotos = await dataConnection().photos.getAll('hero');
        const heroPhotoRows = heroPhotos.map((photo) => {
            const y = parseHeroFocusYFromCaptionOrStyle(photo.captionOrStyle);
            return {
                photo,
                focusY: y ?? 0,
            };
        });
        res.render('pages/admin/hero', { heroPhotoRows, maxNumFiles: MAX_FILES, maxFileSizeMB: MAX_FILE_SIZE_MB });
    } catch (err) {
        next(err);
    }
});

router.post(
    '/',
    Upload.multiple('photos', '/admin/hero'),
    async (req, res, next) => {
        const files = req.files;
        if (!Array.isArray(files) || files.length === 0) {
            req.flash('error', 'Please choose at least one image.');
            return res.redirect(302, '/admin/hero');
        }
        try {
            for (const file of files) {
                await dataConnection().photos.create(
                    file.originalname || 'photo',
                    file.mimetype,
                    file.buffer,
                    'hero',
                    undefined,
                );
            }
            req.flash(
                'success',
                files.length === 1 ? 'Image uploaded.' : `${files.length} images uploaded.`,
            );
            res.redirect(302, '/admin/hero');
        } catch (err) {
            next(err);
        }
    },
);

router.post('/:photoId/focus', async (req, res, next) => {
    const { photoId } = req.params;
    const asyncSave = wantsAsyncFocusSave(req);
    const fy = parseFocusYBody(req.body);
    if (fy === null) {
        if (asyncSave) {
            return res.status(400).json({ ok: false, error: 'Invalid focus value.' });
        }
        req.flash('error', 'Invalid focus value.');
        return res.redirect(302, '/admin/hero');
    }
    try {
        const photo = await dataConnection().photos.get(photoId);
        if (photo.type !== 'hero') {
            if (asyncSave) {
                return res.status(400).json({
                    ok: false,
                    error: 'That image is not a hero carousel photo.',
                });
            }
            req.flash('error', 'That image is not a hero carousel photo.');
            return res.redirect(302, '/admin/hero');
        }
        const style = heroFocusYToCaptionOrStyle(fy);
        await dataConnection().photos.updateCaptionOrStyle(photoId, style);
        if (asyncSave) {
            return res.json({ ok: true });
        }
        req.flash('success', 'Carousel focus saved for this image.');
        res.redirect(302, '/admin/hero');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            if (asyncSave) {
                return res.status(404).json({ ok: false, error: 'Photo not found.' });
            }
            req.flash('error', 'Photo not found.');
            return res.redirect(302, '/admin/hero');
        }
        next(err);
    }
});

router.post('/:photoId/move', async (req, res, next) => {
    const direction = req.query.d as string;
    const { photoId } = req.params;
    const wantsJson = req.get('X-Requested-With') === 'fetch';
    if (direction !== 'up' && direction !== 'down') {
        if (wantsJson) return res.status(400).json({ ok: false, error: 'Invalid direction.' });
        req.flash('error', 'Invalid move.');
        return res.redirect(302, '/admin/hero');
    }
    try {
        const photo = await dataConnection().photos.get(photoId);
        if (photo.type !== 'hero') {
            if (wantsJson) {
                return res.status(400).json({
                    ok: false,
                    error: 'That image is not a hero carousel photo.',
                });
            }
            req.flash('error', 'That image is not a hero carousel photo.');
            return res.redirect(302, '/admin/hero');
        }
        await dataConnection().photos.move(photoId, direction as 'up' | 'down');
        if (wantsJson) return res.json({ ok: true });
        req.flash('success', `Image moved ${direction}.`);
        res.redirect(302, '/admin/hero');
    } catch (err) {
        if (wantsJson) {
            if (err instanceof DbNotFoundError) {
                return res.status(404).json({ ok: false, error: err.message });
            }
            if (err instanceof DbError) {
                return res.status(400).json({ ok: false, error: err.message });
            }
            console.error(err);
            return res.status(500).json({ ok: false, error: 'Server error.' });
        }
        next(err);
    }
});

router.post('/:photoId/delete', async (req, res, next) => {
    const { photoId } = req.params;
    try {
        const photo = await dataConnection().photos.get(photoId);
        if (photo.type !== 'hero') {
            req.flash('error', 'That image is not a hero carousel photo.');
            return res.redirect(302, '/admin/hero');
        }
        await dataConnection().photos.delete(photoId);
        req.flash('success', 'Hero image removed.');
        res.redirect(302, '/admin/hero');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Photo not found.');
            return res.redirect(302, '/admin/hero');
        }
        next(err);
    }
});

export default router;

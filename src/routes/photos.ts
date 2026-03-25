import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { DbError, DbNotFoundError } from '../data/dbErrors';
import { requireAdmin } from '../middleware/adminAuth';
import { uploadPhotos } from '../middleware/uploadPhotos';
import { HttpError } from '../types/HttpError';

const router = express.Router();

/** Matches client-side maxlength on the photos page caption editor. */
const PHOTO_CAPTION_MAX_LENGTH = 500;

router.get('/', async (req, res, next) => {
    try {
        const professionalPhotos = await dataConnection().photos.getAll('professional');
        professionalPhotos.sort(
            (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
        );
        res.render('pages/photos', {
            professionalPhotos,
            photoCaptionMaxLength: PHOTO_CAPTION_MAX_LENGTH,
        });
    } catch (err) {
        next(err);
    }
});

router.post(
    '/professional',
    requireAdmin,
    uploadPhotos(() => '/photos'),
    async (req, res, next) => {
        const files = req.files;
        if (!Array.isArray(files) || files.length === 0) {
            req.flash('error', 'Please choose at least one image.');
            return res.redirect(302, '/photos');
        }
        try {
            for (const file of files) {
                await dataConnection().photos.create(
                    file.originalname || 'photo',
                    file.mimetype,
                    file.buffer,
                    'professional',
                    undefined,
                );
            }
            req.flash(
                'success',
                files.length === 1 ? 'Photo uploaded.' : `${files.length} photos uploaded.`,
            );
            res.redirect(302, '/photos');
        } catch (err) {
            next(err);
        }
    },
);

router.post('/professional/:photoId/caption', requireAdmin, async (req, res, next) => {
    const { photoId } = req.params;
    const raw = req.body?.caption;
    const caption =
        typeof raw === 'string' ? raw.trim().slice(0, PHOTO_CAPTION_MAX_LENGTH) : '';
    try {
        const photo = await dataConnection().photos.get(photoId);
        if (photo.type !== 'professional') {
            req.flash('error', 'That photo is not part of the gallery.');
            return res.redirect(302, '/photos');
        }
        await dataConnection().photos.updateCaptionOrStyle(photoId, caption.length > 0 ? caption : undefined);
        req.flash('success', 'Caption saved.');
        res.redirect(302, '/photos');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Photo not found.');
            return res.redirect(302, '/photos');
        }
        if (err instanceof DbError) {
            req.flash('error', err.message);
            return res.redirect(302, '/photos');
        }
        next(err);
    }
});

router.post('/professional/:photoId/delete', requireAdmin, async (req, res, next) => {
    const { photoId } = req.params;
    try {
        const photo = await dataConnection().photos.get(photoId);
        if (photo.type !== 'professional') {
            req.flash('error', 'That photo is not part of the gallery.');
            return res.redirect(302, '/photos');
        }
        await dataConnection().photos.delete(photoId);
        req.flash('success', 'Photo removed from the gallery.');
        res.redirect(302, '/photos');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Photo not found.');
            return res.redirect(302, '/photos');
        }
        next(err);
    }
});

router.get('/:photoId', async (req, res, next) => {
    const { photoId } = req.params;
    try {
        const photo = await dataConnection().photos.get(photoId);
        const updated = new Date(photo.updated);
        const etag = `W/"${updated.getTime()}"`;
        const lastModified = updated.toUTCString();

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', lastModified);

        const ifNoneMatch = req.get('If-None-Match');
        if (ifNoneMatch != null && ifNoneMatch.trim() === etag) {
            return res.status(304).end();
        }

        const ifModifiedSince = req.get('If-Modified-Since');
        if (ifModifiedSince != null) {
            const since = new Date(ifModifiedSince);
            if (!isNaN(since.getTime()) && updated.getTime() <= since.getTime()) {
                return res.status(304).end();
            }
        }

        const file = await dataConnection().photos.getPhoto(photoId);
        res.type(photo.mimeType);
        res.send(file);
    } catch (err) {
        if (err instanceof DbNotFoundError) next(new HttpError(404, err.message));
        else if (err instanceof DbError) next(new HttpError(400, err.message));
        else next(new HttpError(500, err instanceof Error ? err.message : undefined));
    }
});

export default router;

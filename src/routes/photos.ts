import express from 'express';
import { database, DbError, DbNotFoundError } from '../data/database';
import { HttpError } from '../types/HttpError';

const router = express.Router();

function toHttpDate(date: Date): string {
    return new Date(date).toUTCString();
}

router.get('/:photoId', async (req, res, next) => {
    const { photoId } = req.params;
    try {
        const photo = await database.photos.get(photoId);
        const updated = new Date(photo.updated);
        const etag = `W/"${updated.getTime()}"`;
        const lastModified = toHttpDate(updated);

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

        const file = await database.photos.getPhoto(photoId);
        res.type(photo.mimeType);
        res.send(file);
    } catch (err) {
        if (err instanceof DbNotFoundError) next(new HttpError(404, err.message));
        else if (err instanceof DbError) next(new HttpError(400, err.message));
        else next(new HttpError(500, err instanceof Error ? err.message : undefined));
    }
});

export default router;
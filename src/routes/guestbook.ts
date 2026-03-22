import express from 'express';
import multer from 'multer';

import { database, DbNotFoundError } from '../data/database';
import { getAuthorCookie, isViewerAuthor, setAuthorCookie } from '../middleware/authorCookie';
import { uploadPhoto } from '../middleware/guestbookUpload';
import { Author } from '../data/types/Author';
import { hasValidAdminCookie } from '../middleware/adminAuth';
import { GuestbookEntry } from '../data/types/GuestbookEntry';

const router = express.Router();

async function get(req: express.Request, res: express.Response, filter: (entry: GuestbookEntry) => boolean, isEveryone: boolean) {
    const limit = parseInt(req.query.limit as string) || 10;
    const allEntries = await database.guestbook.getAll();
    const filteredEntries = allEntries.filter(filter);

    const totalEntries = filteredEntries.length;
    const totalPages = totalEntries === 0 ? 1 : Math.ceil(totalEntries / limit);

    let page = parseInt(req.query.page as string) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * limit;
    const entries = filteredEntries.slice(offset, offset + limit);

    res.render('pages/guestbook', { entries, page, limit, totalEntries, isEveryone });
}

/** Development only: set author cookie to seeded fixture user, then open My posts with all list states. */
if (process.env.NODE_ENV === 'development') {
    router.get('/__dev/fixture-author', (req, res) => {
        const id = database.getGuestbookDevFixtureAuthorId();
        if (!id) {
            res.status(503).send('Fixture not available (database not initialised).');
            return;
        }
        setAuthorCookie(res, id);
        res.redirect(302, '/guestbook/mine');
    });
}

router.get('/', async (req, res) => {
    await get(req, res, (entry) => entry.visible && !entry.hidden, true);
});

router.get('/mine', async (req, res) => {
    await get(req, res, (entry) => entry.author.id === getAuthorCookie(req), false);
});

router.get('/new', (req, res) => {
    res.render('pages/guestbook-edit', { isNew: true, entry: null });
});

router.post('/new', uploadPhoto(() => '/guestbook/new'), async (req, res, next) => {
    try {
        const displayNameRaw = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
        const contentRaw = typeof req.body.content === 'string' ? req.body.content.trim() : '';
        const visible = req.body.visible === '1' || req.body.visible === 'on';
        const file = req.file;
        const hasContent = contentRaw.length > 0;
        const hasNewPhoto = Boolean(file);

        if (!hasContent && !hasNewPhoto) {
            req.flash('error', 'Please write a message or upload a photo (or both).');
            return res.redirect(302, '/guestbook/new');
        }

        const viewerId = getAuthorCookie(req);
        let author: Author;
        if (viewerId) {
            try {
                author = await database.authors.get(viewerId);
            } catch (err) {
                if (err instanceof DbNotFoundError) {
                    author = await database.authors.create();
                    setAuthorCookie(res, author.id);
                } else {
                    return next(err);
                }
            }
        } else {
            author = await database.authors.create();
            setAuthorCookie(res, author.id);
        }

        let photo;
        if (file) {
            photo = await database.photos.create(file.originalname || 'photo', file.mimetype, file.buffer);
        }

        const entry = await database.guestbook.create(
            author,
            visible,
            hasContent ? contentRaw : undefined,
            displayNameRaw || undefined,
            photo
        );
        req.flash('success', 'Your message was posted.');
        res.redirect(302, `/guestbook/${encodeURIComponent(entry.id)}`);
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Author not found');
            return res.redirect(302, '/guestbook');
        }
        next(err);
    }
});

router.get('/:entryId', async (req, res, next) => {
    try {
        const entry = await database.guestbook.get(req.params.entryId);
        const isAuthor = isViewerAuthor(req, entry.author.id);
        const isAdmin = hasValidAdminCookie(req);
        if ((!entry.visible || entry.hidden) && !isAuthor) {
            req.flash('error', 'Guestbook entry not found');
            return res.redirect(302, '/guestbook');
        }
        res.render('pages/guestbook-view', { entry, isAuthor, isAdmin });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Guestbook entry not found');
            return res.redirect(302, '/guestbook');
        }
        next(err);
    }
});

router.get('/:entryId/edit', async (req, res, next) => {
    try {
        const entry = await database.guestbook.get(req.params.entryId);
        if (!isViewerAuthor(req, entry.author.id)) {
            req.flash('error', 'You can only edit your own guestbook messages.');
            return res.redirect(302, '/guestbook');
        }
        res.render('pages/guestbook-edit', {
            isNew: false,
            entry
        });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Guestbook entry not found');
            return res.redirect(302, '/guestbook');
        }
        next(err);
    }
});

router.post('/:entryId/edit', 
    uploadPhoto((req: express.Request) => `/guestbook/${encodeURIComponent(req.params.entryId)}/edit`),
    async (req, res, next) => {
    try {
        const entryId = req.params.entryId;
        const entry = await database.guestbook.get(entryId);
        if (!isViewerAuthor(req, entry.author.id)) {
            req.flash('error', 'You can only edit your own guestbook messages.');
            return res.redirect(302, '/guestbook');
        }
        const displayNameRaw = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
        const contentRaw = typeof req.body.content === 'string' ? req.body.content.trim() : '';
        const visible = req.body.visible === '1' || req.body.visible === 'on';
        const file = req.file;

        let photo = entry.photo;
        if (file) {
            if (entry.photo) {
                await database.photos.delete(entry.photo.id);
            }
            photo = await database.photos.create(file.originalname || 'photo', file.mimetype, file.buffer);
        }

        const hasContent = contentRaw.length > 0;
        const hasPhoto = photo !== undefined;
        if (!hasContent && !hasPhoto) {
            req.flash('error', 'Please write a message or keep/upload a photo (at least one is required).');
            return res.redirect(302, `/guestbook/${encodeURIComponent(entryId)}/edit`);
        }

        await database.guestbook.update(
            entryId,
            visible,
            hasContent ? contentRaw : undefined,
            displayNameRaw || undefined,
            photo
        );
        req.flash('success', 'Your message was updated.');
        res.redirect(302, `/guestbook/${encodeURIComponent(entryId)}`);
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Guestbook entry not found');
            return res.redirect(302, '/guestbook');
        }
        next(err);
    }
});

router.post('/:entryId/delete', async (req, res, next) => {
    try {
        const entryId = req.params.entryId;
        const entry = await database.guestbook.get(entryId);
        if (!isViewerAuthor(req, entry.author.id)) {
            req.flash('error', 'You can only delete your own guestbook messages.');
            return res.redirect(302, '/guestbook');
        }
        if (entry.photo) {
            await database.photos.delete(entry.photo.id);
        }
        await database.guestbook.delete(entryId);
        req.flash('success', 'Your message was deleted.');
        res.redirect(302, '/guestbook/mine');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Guestbook entry not found');
            return res.redirect(302, '/guestbook');
        }
        next(err);
    }
});

export default router;

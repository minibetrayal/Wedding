import express from 'express';

import { database, DbNotFoundError } from '../../data/database';
import { HttpError } from '../../types/HttpError';

const router = express.Router();

router.get('/', async (_req, res) => {
    const invites = await database.invites.getAll();
    res.render('pages/admin/invites', { invites });
});

router.get('/new', (_req, res) => {
    res.render('pages/admin/invite-edit', {
        isNew: true,
        invite: {
            name: '',
            phone: '',
            email: '',
            notes: '',
            invitees: [],
        },
    });
});

router.get('/:inviteId/edit', async (req, res, next) => {
    try {
        const invite = await database.invites.get(req.params.inviteId);
        res.render('pages/admin/invite-edit', { invite, isNew: false });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            next(new HttpError(404, err.message));
            return;
        }
        next(err);
    }
});

router.post('/:inviteId/delete', async (req, res, next) => {
    try {
        await database.invites.delete(req.params.inviteId);
        res.redirect(302, '/admin/invites');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            next(new HttpError(404, err.message));
            return;
        }
        next(err);
    }
});

router.get('/:inviteId', async (req, res, next) => {
    try {
        const invite = await database.invites.get(req.params.inviteId);
        res.render('pages/admin/invite-view', { invite });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            next(new HttpError(404, err.message));
            return;
        }
        next(err);
    }
});

export default router;

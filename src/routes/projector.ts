import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { connect } from '../util/projectorSse';

const router = express.Router();

router.get('/stream', async (req, res, next) => {
    try {
        await connect(req, res);
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req, res) => {
    const projector = await dataConnection().projector.get();
    const entryIds = await dataConnection().projector.getGuestbookEntryIds();
    res.render('pages/projector', { projector, entryIds });
});

router.get('/guestbook/:entryId', async (req, res) => {
    const entryId = req.params.entryId;
    try {
        const entry = await dataConnection().guestbook.get(entryId);
        if (!entry.visible || entry.moderated) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json(entry);
    } catch (error) {
        res.status(404).json({ error: 'Entry not found' });
    }
});

export default router;
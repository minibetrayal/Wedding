import express from 'express';

import { database } from '../data/tempConnection';
import { openProjectorSseStream } from '../util/projectorSse';

const router = express.Router();

router.get('/stream', async (req, res, next) => {
    try {
        await openProjectorSseStream(req, res);
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req, res) => {
    const projector = await database.projector.get();
    res.render('pages/projector', { projector });
});

router.get('/guestbook/:entryId', async (req, res) => {
    const entryId = req.params.entryId;
    try {
        const entry = await database.guestbook.get(entryId);
        if (!entry.visible || entry.moderated) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json(entry);
    } catch (error) {
        res.status(404).json({ error: 'Entry not found' });
    }
});

export default router;
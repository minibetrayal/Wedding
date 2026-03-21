import express from 'express';
import { database } from '../data/database';

const router = express.Router();

router.get('/', async (req, res) => {
    const entries = await database.guestbook.getAll();
    const visibleEntries = entries.filter(entry => entry.visible);
    res.render('pages/guestbook', { entries: visibleEntries });
});

export default router;
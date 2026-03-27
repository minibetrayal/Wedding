import express from 'express';
import { getDataConnection } from '../../data/def/DataConnection';
import { DEFAULT_SETTINGS,Settings } from '../../data/def/types/Settings';

const router = express.Router();

router.get('/', async (req, res) => {
    const settings = Object.fromEntries(await Promise.all(Object.keys(DEFAULT_SETTINGS).map(async (key) => {
        const value = await getDataConnection().settings.get(key as keyof Settings);
        return [
            key,
            value,
        ];
    })));
    res.render('pages/admin/settings', { settings });
});

router.get('/lock', async (req, res) => {
    await getDataConnection().settings.set('siteLocked', true);
    req.flash('success', 'Site Locked');
    res.redirect(302, '/admin/settings');
});

router.get('/unlock', async (req, res) => {
    await getDataConnection().settings.set('siteLocked', false);
    req.flash('success', 'Site Unlocked');
    res.redirect(302, '/admin/settings');
});

export default router;
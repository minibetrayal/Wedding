import express from 'express';
import { getDataConnection } from '../../data/def/DataConnection';
import { DEFAULT_SETTINGS,Settings } from '../../data/def/types/Settings';
import { setLockedCookie } from '../../middleware/lockedCookie';

const router = express.Router();

function parseBody(body: unknown): {
    names: string;
    namesShort: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
} {
    const raw = body as Record<string, unknown>;
    return {
        names: typeof raw.names === 'string' ? raw.names.trim() : '',
        namesShort: typeof raw.namesShort === 'string' ? raw.namesShort.trim() : '',
        contactName: typeof raw.contactName === 'string' ? raw.contactName.trim() : '',
        contactPhone: typeof raw.contactPhone === 'string' ? raw.contactPhone.trim() : '',
        contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail.trim() : ''
    };
}

router.get('/', async (req, res) => {
    const settings = Object.fromEntries(await Promise.all(Object.keys(DEFAULT_SETTINGS).map(async (key) => {
        const value = await getDataConnection().settings.get(key as keyof Settings);
        return [
            key,
            value,
        ];
    })));
    console.log(settings);
    res.render('pages/admin/settings', { settings });
});

router.get('/lock', async (req, res) => {
    await getDataConnection().settings.set('siteLocked', true);
    setLockedCookie(res);
    req.flash('success', 'Site Locked');
    res.redirect(302, '/admin/settings');
});

router.get('/unlock', async (req, res) => {
    await getDataConnection().settings.set('siteLocked', false);
    req.flash('success', 'Site Unlocked');
    res.redirect(302, '/admin/settings');
});


router.post('/', async (req, res, next) => {
    const parsed = parseBody(req.body);
    try {
        const settings = getDataConnection().settings;      
        await settings.set('names', parsed.names);
        await settings.set('namesShort', parsed.namesShort);
        await settings.set('contactName', parsed.contactName);
        await settings.set('contactPhone', parsed.contactPhone);
        await settings.set('contactEmail', parsed.contactEmail);
        req.flash('success', 'Names and contact details updated.');
        res.redirect(302, '/admin/settings');
    } catch (err) {
        next(err);
    }
});

export default router;
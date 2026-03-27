import express from 'express';
import { hasLockedCookie, setLockedCookie } from '../middleware/lockedCookie';
import { safeRedirectPath, verifyAdminPassword } from '../middleware/adminAuth';
import { getDataConnection } from '../data/def/DataConnection';

const router = express.Router();

router.get('/login', async (req, res) => {
    const next = safeRedirectPath(req.query.next);
    if (hasLockedCookie(req)) {
        res.redirect(302, next);
        return;
    }
    const isLocked = await getDataConnection().settings.get('siteLocked');
    if (!isLocked) {
        res.redirect(302, next);
        return;
    }
    res.render('pages/admin/login', { next, formAction: '/locked/login' });
});

router.post('/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const next = safeRedirectPath(req.body?.next);

    if (!verifyAdminPassword(password)) {
        req.flash('error', 'Invalid password.');
        const q = new URLSearchParams({ next });
        return res.redirect(302, `/locked/login?${q.toString()}`);
    }

    setLockedCookie(res);
    req.flash('success', 'Site Unlocked');
    res.redirect(302, next);
});

export default router;
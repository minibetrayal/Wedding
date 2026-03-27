import express from 'express';
import { clearLockedCookie, hasLockedCookie, isSiteLocked, setLockedCookie } from '../middleware/lockedCookie';
import { safeRedirectPath, verifyAdminPassword } from '../middleware/adminAuth';
import { getDataConnection } from '../data/def/DataConnection';

const router = express.Router();

router.get('/login', async (req, res) => {
    const next = safeRedirectPath(req.query.next);
    if (hasLockedCookie(req) || !(await isSiteLocked())) return res.redirect(302, next);
    res.render('pages/locked-login', { next });
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

router.get('/logout', (req, res) => {
    clearLockedCookie(res);
    req.flash('success', 'Site Locked');
    res.redirect(302, '/');
});

router.get('/', (req, res) => {
    res.render('pages/locked');
});

export default router;
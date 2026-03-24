import express from 'express';

import {
    clearAdminAuthCookie,
    hasValidAdminCookie,
    requireAdmin,
    safeAdminRedirectPath,
    setAdminAuthCookie,
    verifyAdminPassword,
} from '../../middleware/adminAuth';

import adminProjectorRoutes from './admin-projector';
import invitesRoutes from './invites';
import heroRoutes from './hero';
import ferryRoutes from './ferry';

const router = express.Router();

router.get('/login', (req, res) => {
    const next = safeAdminRedirectPath(req.query.next);
    if (hasValidAdminCookie(req)) {
        res.redirect(302, next);
        return;
    }
    res.render('pages/admin/login', { next });
});

router.post('/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const next = safeAdminRedirectPath(req.body?.next);

    if (!verifyAdminPassword(password)) {
        req.flash('error', 'Invalid password.');
        const q = new URLSearchParams({ next });
        return res.redirect(302, `/admin/login?${q.toString()}`);
    }

    setAdminAuthCookie(res);
    req.flash('success', 'Logged in successfully');
    res.redirect(302, next);
});

router.get('/logout', (req, res) => {
    clearAdminAuthCookie(res);
    req.flash('success', 'Logged out successfully');
    res.redirect(302, '/');
});

router.use(requireAdmin);

router.get('/', (req, res) => {
    res.render('pages/admin/admin');
});

router.use('/invites', invitesRoutes);
router.use('/projector', adminProjectorRoutes);
router.use('/hero', heroRoutes);
router.use('/ferry', ferryRoutes);

export default router;
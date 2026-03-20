import express from 'express';

import {
    clearAdminAuthCookie,
    hasValidAdminCookie,
    requireAdmin,
    safeAdminRedirectPath,
    setAdminAuthCookie,
    verifyAdminPassword,
} from '../../middleware/adminAuth';

import invitesRoutes from './invites';

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
        res.status(401).render('pages/admin/login', {
            error: 'Invalid password.',
            next,
        });
        return;
    }

    setAdminAuthCookie(res);
    res.redirect(302, next);
});

router.get('/logout', (req, res) => {
    clearAdminAuthCookie(res);
    res.redirect(302, '/');
});

router.use(requireAdmin);

router.get('/', (req, res) => {
    res.render('pages/admin/admin');
});

router.use('/invites', invitesRoutes);

export default router;
import express from 'express';

import invitesRoutes from './invites';

const router = express.Router();

router.get('/', (req, res) => {
    res.render('pages/admin/admin');
});

router.use('/invites', invitesRoutes);

export default router;
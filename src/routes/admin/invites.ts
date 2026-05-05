import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { DbNotFoundError } from '../../data/dbErrors';
import { parseCarpoolSpotsOffered } from '../../util/inviteCarpool';
import { stringify } from 'csv-stringify/sync';
import { LocationType } from '../../data/def/types/Location';

const router = express.Router();

router.get('/', async (_req, res) => {
    const invites = await dataConnection().invites.getAll();
    res.render('pages/admin/invites', { invites });
});

router.get('/new', (_req, res) => {
    res.render('pages/admin/invite-edit', {
        isNew: true,
        invite: {
            name: '',
            phone: '',
            email: '',
            notes: '',
            carpoolRequested: false,
            carpoolSpotsOffered: 0,
            invitees: [],
        },
    });
});

router.get('/export/invitees', async (req, res, next) => {
    try {
        const rows = [['invite id', 'name', 'seen', 'responded', 'attending', 'dietary restrictions']];
        const invites = await dataConnection().invites.getAll();
        for (let invite of invites) {
            const invitees = invite.invitees;
            for (let invitee of invitees) {
                const row = [invite.id, invitee.name, invite.seen ? 'yes' : 'no', invite.responded ? 'yes' : 'no', invitee.attending ? 'yes' : 'no', invitee.dietaryRestrictions ?? ''];
                rows.push(row);
            }
        }
        const csv = stringify(rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="invitees.csv"');
        res.send(csv);
    } catch (err) {
        next(err);
    }
});

router.get('/export', async (req, res, next) => {
    try {
        const rows = [[
            'invite id', 
            'recipient', 
            'seen', 
            'responded', 
            'attending', 
            'phone', 
            'email', 
            'carpool requested', 
            'carpool offered', 
            'island lift requested', 
            'notes'
        ]];
        const invites = await dataConnection().invites.getAll();
        for (let invite of invites) {
            const row = [
                invite.id, 
                invite.name, invite.seen ? 'yes' : 'no', 
                invite.responded ? 'yes' : 'no', 
                `${invite.attending()}`, 
                invite.phone ?? '', 
                invite.email ?? '', 
                invite.carpoolRequested ? `${invite.attending()}` : '0', 
                `${invite.carpoolSpotsOffered}`, 
                invite.islandLiftRequested ? 'yes' : 'no', 
                invite.notes ?? ''
            ];
            rows.push(row);
        }
        const csv = stringify(rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="invites.csv"');
        res.send(csv);
    } catch (err) {
        next(err);
    }
});

router.get('/:inviteId/edit', async (req, res, next) => {
    const inviteId = req.params.inviteId;
    try {
        const invite = await dataConnection().invites.get(inviteId);
        res.render('pages/admin/invite-edit', { invite, isNew: false });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Invitation not found');
            return res.redirect(302, '/admin/invites');
        }
        next(err);
    }
});

router.get('/:inviteId/image', async (req, res, next) => {
    try {
        const inviteId = req.params.inviteId;
        const invite = await dataConnection().invites.get(inviteId);
        
        const inviteName = invite.name;
        const isPlural = inviteName.startsWith('The ') && inviteName.endsWith('s') ||
            inviteName.includes(' and ') || inviteName.includes(' & ');
        const inviteLine = `${inviteName} ${isPlural ? 'Are' : 'Is'} invited to celebrate the wedding of`;
        const namesLine = await dataConnection().settings.get('names');
        const islandName = (await dataConnection().locations.get(LocationType.island)).name;
        const eventDateRaw = await dataConnection().schedule.getDate();
        const ymd = eventDateRaw.split('-');
        const dateLine = `${islandName}     ·     ${ymd[2]} · ${ymd[1]} · ${ymd[0]}`;
        let urlLine = `${process.env.WEBSITE_URL}`;
        for (let name of ['and', ...namesLine.split(' ')]) {
            urlLine = urlLine.replace(name, name.toUpperCase().charAt(0) + name.toLowerCase().slice(1));
        }

        const targetUrl = process.env.WEBSITE_URL?.replace(/\/+$/, '') + `/rsvp/${inviteId}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?margin=15&size=1000x1000&ecc=M&data=${encodeURIComponent(targetUrl)}`;

        const inviteNameFont = 'Great Vibes';
        const font = 'Playfair Display';
        const inviteCodeFont = 'Cascadia Code';

        res.type('text/plain').send('Invite image (stub)');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Invitation not found');
            return res.redirect(302, '/admin/invites');
        }
        next(err);
    }
});

router.post('/:inviteId/delete', async (req, res, next) => {
    try {
        await dataConnection().invites.delete(req.params.inviteId);
        req.flash('success', 'Invitation deleted.');
        res.redirect(302, '/admin/invites');
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Invitation not found');
            return res.redirect(302, '/admin/invites');
        }
        next(err);
    }
});

router.get('/:inviteId', async (req, res, next) => {
    try {
        const invite = await dataConnection().invites.get(req.params.inviteId);
        res.render('pages/admin/invite-view', { invite });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Invitation not found');
            return res.redirect(302, '/admin/invites');
        }
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const bodyInvitees = req.body.invitees;
        if (!bodyInvitees || bodyInvitees.length === 0) {
            req.flash('error', 'Invitees are required');
            return res.redirect(302, '/admin/invites/new');
        }
        const invitees = [];
        for (const bodyInvitee of bodyInvitees) {
            const name = bodyInvitee.name;
            const attending: boolean | undefined = bodyInvitee.attending === 'true' 
                ? true 
                : bodyInvitee.attending === 'false' 
                    ? false 
                    : undefined;
            const dietaryRestrictions: string | undefined = bodyInvitee.dietaryRestrictions || undefined;
            if (!name) {
                req.flash('error', 'Guest Name is required');
                return res.redirect(302, '/admin/invites/new');
            }
            const invitee = await dataConnection().invitees.create(name, attending, dietaryRestrictions);
            invitees.push(invitee);
        }
        const name = req.body.name;
        const phone = req.body.phone;
        const email = req.body.email;
        const notes = req.body.notes;
        if (!name) {
            req.flash('error', 'Recipient Name is required');
            return res.redirect(302, '/admin/invites/new');
        }
        const invite = await dataConnection().invites.create(name, invitees);
        const carpoolRequested = req.body.carpoolRequested === '1' || req.body.carpoolRequested === 'on';
        const carpoolSpotsOffered = carpoolRequested
            ? 0
            : parseCarpoolSpotsOffered(req.body.carpoolSpotsOffered);
        if (phone || email || notes || carpoolRequested || carpoolSpotsOffered > 0) {
            await dataConnection().invites.update(
                invite.id,
                phone || undefined,
                email || undefined,
                notes || undefined,
                carpoolRequested,
                carpoolSpotsOffered
            );
        }
        await dataConnection().invites.updateStatus(invite.id, req.body.seen === '1', req.body.responded === '1');
        req.flash('success', 'Invitation created successfully');
        res.redirect(302, `/admin/invites/${invite.id}`);
    } catch (err) {
        next(err);
    }
});

router.post('/:inviteId/edit', async (req, res, next) => {
    try {
        const inviteId = req.params.inviteId;
        let invite;
        try {
            invite = await dataConnection().invites.get(inviteId);
        } catch (err) {
            if (err instanceof DbNotFoundError) {
                req.flash('error', 'Invitation not found');
                return res.redirect(302, '/admin/invites');
            }
            throw err;
        }

        const bodyInvitees = req.body.invitees;
        if (!bodyInvitees || bodyInvitees.length === 0) {
            req.flash('error', 'Invitees are required');
            return res.redirect(302, `/admin/invites/${inviteId}/edit`);
        }

        const nextInvitees = [];
        for (const bodyInvitee of bodyInvitees) {
            const id = bodyInvitee.id;
            const name = bodyInvitee.name;
            const attending: boolean | undefined = bodyInvitee.attending === 'true' 
                ? true 
                : bodyInvitee.attending === 'false' 
                    ? false 
                    : undefined;
            const dietaryRestrictions: string | undefined = bodyInvitee.dietaryRestrictions || undefined;
            if (!name) {
                req.flash('error', 'Guest Name is required');
                return res.redirect(302, `/admin/invites/${inviteId}/edit`);
            }
            const existing = id ? invite.invitees.find(i => i.id === id) : undefined;
            if (existing) {
                await dataConnection().invitees.update(existing.id, name, attending, dietaryRestrictions);
                nextInvitees.push(existing);
            } else {
                const created = await dataConnection().invitees.create(name, attending, dietaryRestrictions);
                nextInvitees.push(created);
            }
        }
        const keptIds = new Set(nextInvitees.map((i) => i.id));
        for (const previous of invite.invitees) {
            if (!keptIds.has(previous.id)) {
                await dataConnection().invitees.delete(previous.id);
            }
        }
        const name = req.body.name;
        const phone = req.body.phone;
        const email = req.body.email;
        const notes = req.body.notes;
        if (!name) {
            req.flash('error', 'Recipient Name is required');
            return res.redirect(302, `/admin/invites/${inviteId}/edit`);
        }
        await dataConnection().invites.updateInvite(inviteId, name, nextInvitees);
        const carpoolRequested = req.body.carpoolRequested === '1' || req.body.carpoolRequested === 'on';
        const carpoolSpotsOffered = carpoolRequested
            ? 0
            : parseCarpoolSpotsOffered(req.body.carpoolSpotsOffered);
        const islandLiftRequested = req.body.islandLiftRequested === '1' || req.body.islandLiftRequested === 'on';
        await dataConnection().invites.update(
            invite.id,
            typeof phone === 'string' && phone.trim() ? phone.trim() : undefined,
            typeof email === 'string' && email.trim() ? email.trim() : undefined,
            typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
            carpoolRequested,
            carpoolSpotsOffered,
            islandLiftRequested
        );
        await dataConnection().invites.updateStatus(inviteId, req.body.seen === '1', req.body.responded === '1');
        req.flash('success', 'Invitation updated successfully');
        res.redirect(302, `/admin/invites/${invite.id}`);
    } catch (err) {
        next(err);
    }
});

export default router;

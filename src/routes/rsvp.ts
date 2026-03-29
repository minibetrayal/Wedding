import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { DbNotFoundError } from '../data/dbErrors';
import { hasValidAdminCookie } from '../middleware/adminAuth';
import { clearRsvpCookie, getRsvpCookie, setRsvpCookie } from '../middleware/rsvpCookie';
import { normalizeArray } from '../util/arrayUtils';
import { parseCarpoolSpotsOffered } from '../util/inviteCarpool';

const router = express.Router();

/** Trim and remove spaces; uppercase so guests can type codes case-insensitively. */
function normalizeInviteCode(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return raw.trim().replace(/\s+/g, '').toUpperCase();
}

router.get('/', async (req, res, next) => {
    try {
        if (req.query.clear !== undefined) {
            clearRsvpCookie(res);
            return res.redirect(302, '/rsvp');
        }

        const inviteCode = req.query.inviteCode;
        const explicitCode =
            typeof inviteCode === 'string' && inviteCode.trim().length > 0 ? inviteCode : undefined;

        if (!explicitCode) {
            const remembered = getRsvpCookie(req);
            if (remembered) {
                try {
                    await dataConnection().invites.get(remembered);
                    return res.redirect(302, `/rsvp/${encodeURIComponent(remembered)}`);
                } catch (err) {
                    if (err instanceof DbNotFoundError) {
                        clearRsvpCookie(res);
                    } else {
                        throw err;
                    }
                }
            }
        }

        res.render('pages/rsvp', { inviteCode });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const raw = req.body.inviteCode;
        const code = normalizeInviteCode(raw);
        if (!code) {
            req.flash('error', 'Please enter the code from your invitation.');
            return res.redirect(302, '/rsvp');
        }
        try {
            await dataConnection().invites.get(code);
        } catch (err) {
            if (err instanceof DbNotFoundError) {
                req.flash('error', 'We could not find an invitation with that code. Check the letters and numbers and try again.');
                return res.redirect(302, `/rsvp?inviteCode=${encodeURIComponent(code)}`);
            }
            throw err;
        }
        res.redirect(302, `/rsvp/${encodeURIComponent(code)}`);
    } catch (err) {
        next(err);
    }
});

router.get('/:inviteId', async (req, res, next) => {
    const inviteId = req.params.inviteId;
    try {
        const invite = await dataConnection().invites.get(inviteId);
        const closeDate = await dataConnection().settings.get('rsvpCloseDate');
        let isClosed = false;
        if (closeDate) {
            const closeTime = new Date(closeDate);
            closeTime.setHours(24, 0, 0, 0);
            isClosed = closeTime < new Date();
        }
        if (!invite.seen && !hasValidAdminCookie(req)) {
            await dataConnection().invites.updateStatus(inviteId, true, invite.responded);
        }
        if (!hasValidAdminCookie(req)) {
            setRsvpCookie(res, invite.id);
        }
        res.render('pages/rsvp-edit', { invite, isClosed });
    } catch (err) {
        if (err instanceof DbNotFoundError) {
            req.flash('error', 'Invitation not found');
            return res.redirect(302, '/rsvp');
        }
        next(err);
    }
});

router.post('/:inviteId', async (req, res, next) => {
    try {
        const inviteId = req.params.inviteId;
        let invite;
        try {
            invite = await dataConnection().invites.get(inviteId);
        } catch (err) {
            if (err instanceof DbNotFoundError) {
                req.flash('error', 'Invitation not found');
                return res.redirect(302, '/rsvp');
            }
            throw err;
        }

        const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
        // if (!phone) {
        //     req.flash('error', 'Please enter a phone number we can reach you on.');
        //     return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
        // }

        const email =
            typeof req.body.email === 'string' && req.body.email.trim()
                ? req.body.email.trim()
                : undefined;
        const notes =
            typeof req.body.notes === 'string' && req.body.notes.trim()
                ? req.body.notes.trim()
                : undefined;

        const rows = normalizeArray(req.body.invitees);
        if (!rows || rows.length === 0) {
            req.flash('error', 'Guest responses are missing. Please reload the page and try again.');
            return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
        }

        const byId = new Map(invite.invitees.map((i) => [i.id, i]));
        const covered = new Set<string>();

        type InviteeRow = (typeof invite.invitees)[number];
        const parsed: { invitee: InviteeRow; attending?: boolean; dietary?: string }[] = [];

        let anyAttending = false;

        for (const row of rows) {
            if (!row || typeof row !== 'object') {
                req.flash('error', 'Invalid guest data. Please reload the page and try again.');
                return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
            }
            const id = typeof row.id === 'string' ? row.id : '';
            const invitee = byId.get(id);
            if (!invitee) {
                req.flash('error', 'This page is out of date. Please reload and try again.');
                return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
            }
            if (covered.has(id)) {
                req.flash('error', 'Duplicate guest entry. Please reload the page and try again.');
                return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
            }
            covered.add(id);

            const att = row.attending;
            if (att === 'true' || att === 'false') {
                anyAttending = true;
            }
            const attending = att === 'true' ? true : att === 'false' ? false : undefined;
            const dietaryRaw = row.dietaryRestrictions;
            const dietary = typeof dietaryRaw === 'string' && dietaryRaw.trim() ? dietaryRaw.trim() : undefined;

            parsed.push({ invitee, attending, dietary });
        }
    

        if (covered.size !== invite.invitees.length) {
            req.flash(
                'error',
                'Every guest on this invitation must have a response. Please reload the page and try again.'
            );
            return res.redirect(302, `/rsvp/${encodeURIComponent(inviteId)}`);
        }

        for (const { invitee, attending, dietary } of parsed) {
            await dataConnection().invitees.update(invitee.id, invitee.name, attending, dietary);
        }

        const carpoolRequested = req.body.carpoolRequested === '1' || req.body.carpoolRequested === 'on';
        const carpoolSpotsOffered = carpoolRequested
            ? 0
            : parseCarpoolSpotsOffered(req.body.carpoolSpotsOffered);
        await dataConnection().invites.update(
            inviteId,
            phone,
            email,
            notes,
            carpoolRequested,
            carpoolSpotsOffered
        );

        console.log(anyAttending);
        if (!hasValidAdminCookie(req)) {
            await dataConnection().invites.updateStatus(inviteId, true, anyAttending);
        }

        req.flash(
            'success',
            'Your RSVP was saved. You can update it any time using the same link or invitation code.'
        );
        res.redirect(302, `/rsvp/${encodeURIComponent(invite.id)}`);
    } catch (err) {
        next(err);
    }
});

export default router;

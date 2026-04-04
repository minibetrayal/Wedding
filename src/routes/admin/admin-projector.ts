import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import type { ProjectorMode } from '../../data/def/types/Projector';
import { broadcast } from '../../util/projectorSse';

const router = express.Router();

const MIN_DWELL_SEC = 5;
const MAX_DWELL_SEC = 60;
const DWELL_STEP_SEC = 5;
const PROJECTOR_MESSAGE_MAX = 100;

function parseMode(raw: unknown): ProjectorMode | null {
    if (raw === 'home' || raw === 'guestbook' || raw === 'message') {
        return raw;
    }
    return null;
}

/** Dwell in seconds; must be a multiple of {@link DWELL_STEP_SEC}. */
function parseDwellSeconds(raw: unknown): number | null {
    const n = typeof raw === 'string' ? parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    if (n < MIN_DWELL_SEC || n > MAX_DWELL_SEC) return null;
    if (n % DWELL_STEP_SEC !== 0) return null;
    return n;
}

function snapDwellSeconds(ms: number): number {
    const sec = Math.round(ms / 1000);
    const snapped = Math.round(sec / DWELL_STEP_SEC) * DWELL_STEP_SEC;
    return Math.min(MAX_DWELL_SEC, Math.max(MIN_DWELL_SEC, snapped));
}

router.get('/', async (req, res, next) => {
    try {
        const projector = await dataConnection().projector.get();
        const guestbookEntryIds = await dataConnection().projector.getGuestbookEntryIds();
        res.render('pages/admin/admin-projector', {
            projector,
            guestbookEntryCount: guestbookEntryIds.length,
            projectorMessageMax: PROJECTOR_MESSAGE_MAX,
            dwellMinSec: MIN_DWELL_SEC,
            dwellMaxSec: MAX_DWELL_SEC,
            dwellStepSec: DWELL_STEP_SEC,
            dwellSecondsSnapped: snapDwellSeconds(projector.dwellMs),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/mode', express.json(), async (req, res, next) => {
    try {
        const mode = parseMode(req.body?.mode);
        if (!mode) {
            res.status(400).json({ ok: false, error: 'Invalid mode.' });
            return;
        }
        if (mode === 'message' && typeof req.body.message === 'string') {
            const trimmed = req.body.message.trim();
            if (trimmed.length > PROJECTOR_MESSAGE_MAX) {
                res.status(400).json({
                    ok: false,
                    error: `Message must be at most ${PROJECTOR_MESSAGE_MAX} characters.`,
                });
                return;
            }
            await dataConnection().projector.setMessage(trimmed);
        }
        await dataConnection().projector.setMode(mode);
        await broadcast();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post('/pause', express.json(), async (req, res, next) => {
    try {
        const raw = req.body?.paused;
        if (typeof raw !== 'boolean') {
            res.status(400).json({ ok: false, error: 'Expected boolean "paused".' });
            return;
        }
        await dataConnection().projector.setPaused(raw);
        await broadcast();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post('/dwell', express.json(), async (req, res, next) => {
    try {
        const dwellSec = parseDwellSeconds(req.body?.dwellSeconds);
        if (dwellSec === null) {
            res.status(400).json({
                ok: false,
                error: `Dwell must be ${MIN_DWELL_SEC}–${MAX_DWELL_SEC}s in steps of ${DWELL_STEP_SEC}.`,
            });
            return;
        }
        await dataConnection().projector.setDwellMs(dwellSec * 1000);
        await broadcast();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post('/message', async (req, res, next) => {
    try {
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
        const action = req.body.messageAction;
        const showOnProjector = action === 'saveAndShow';

        if (message.length === 0 && showOnProjector) {
            req.flash('error', 'Cannot save and display an empty message.');
            return res.redirect(302, '/admin/projector');
        }
        if (message.length > PROJECTOR_MESSAGE_MAX) {
            req.flash('error', `Message must be at most ${PROJECTOR_MESSAGE_MAX} characters.`);
            return res.redirect(302, '/admin/projector');
        }

        await dataConnection().projector.setMessage(message);
        if (showOnProjector) {
            await dataConnection().projector.setMode('message');
            req.flash('success', 'Message saved and the projector is now in message mode.');
        } else {
            req.flash('success', 'Message saved.');
        }

        await broadcast();
        res.redirect(302, '/admin/projector');
    } catch (err) {
        next(err);
    }
});

router.post('/darkmode', express.json(), async (req, res, next) => {
    try {
        const darkMode = req.body?.darkMode === 'dark';
        await dataConnection().projector.setDarkMode(darkMode);
        await broadcast();
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});

export default router;

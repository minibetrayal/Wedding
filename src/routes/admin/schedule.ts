import express from 'express';

import { ScheduleSnapshot, ScheduledEvent } from '../../data/def/types/ScheduledEvent';
import { getDataConnection as dataConnection } from '../../data/def/DataConnection';

const router = express.Router();

const ROLE_NONE = '';

function isSpecialRole(role: string): role is 'arrival' | 'ceremony' | 'reception' | 'endOfDay' {
    return role === 'arrival' || role === 'ceremony' || role === 'reception' || role === 'endOfDay';
}

function normalizeEventsRows(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        return Object.keys(o)
            .filter((k) => /^\d+$/.test(k))
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => o[k]);
    }
    return [];
}

/** Parallel array: '' | 'arrival' | 'ceremony' | 'reception' | 'endOfDay' per row. */
function rolesFromSnapshot(snap: ScheduleSnapshot): string[] {
    const roles = snap.events.map(() => ROLE_NONE);
    roles[snap.arrivalIndex] = 'arrival';
    roles[snap.ceremonyIndex] = 'ceremony';
    roles[snap.receptionIndex] = 'reception';
    roles[snap.endOfDayIndex] = 'endOfDay';
    return roles;
}

function parseScheduleFromBody(body: unknown): ScheduleSnapshot {
    const rowsRaw = normalizeEventsRows((body as Record<string, unknown>).events);
    const events: ScheduledEvent[] = [];
    let arrival = -1;
    let ceremony = -1;
    let reception = -1;
    let endOfDay = -1;

    for (const row of rowsRaw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const name = typeof r.name === 'string' ? r.name.trim() : '';
        const time = typeof r.time === 'string' ? r.time.trim() : '';
        const roleRaw = typeof r.role === 'string' ? r.role.trim() : '';

        if (!name && !time && !roleRaw) {
            continue;
        }
        if (!name || !time) {
            throw new Error('Each event row must include a name and time.');
        }

        const idx = events.length;
        events.push(new ScheduledEvent(name, time));

        if (roleRaw === ROLE_NONE) {
            continue;
        }
        if (!isSpecialRole(roleRaw)) {
            throw new Error('Invalid event role selection.');
        }
        if (roleRaw === 'arrival') {
            if (arrival !== -1) {
                throw new Error('Only one row can be assigned as Arrival.');
            }
            arrival = idx;
        } else if (roleRaw === 'ceremony') {
            if (ceremony !== -1) {
                throw new Error('Only one row can be assigned as Ceremony Start.');
            }
            ceremony = idx;
        } else if (roleRaw === 'reception') {
            if (reception !== -1) {
                throw new Error('Only one row can be assigned as Reception Start.');
            }
            reception = idx;
        } else if (roleRaw === 'endOfDay') {
            if (endOfDay !== -1) {
                throw new Error('Only one row can be assigned as End of Day.');
            }
            endOfDay = idx;
        }
    }

    if (events.length < 4) {
        throw new Error('The schedule must include at least four events (one for each required role).');
    }
    if (arrival === -1 || ceremony === -1 || reception === -1 || endOfDay === -1) {
        throw new Error(
            'Assign exactly one row to each of: Arrival, Ceremony Start, Reception Start, and End of Day.',
        );
    }

    return new ScheduleSnapshot(events, arrival, ceremony, reception, endOfDay);
}

router.get('/', async (req, res, next) => {
    try {
        const [snap, eventDateRaw] = await Promise.all([
            dataConnection().schedule.get(),
            dataConnection().schedule.getDate(),
        ]);
        res.render('pages/admin/schedule', {
            eventDateRaw,
            events: snap.events,
            eventRoles: rolesFromSnapshot(snap),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const date = typeof req.body.date === 'string' ? req.body.date.trim() : '';
        if (!date) {
            throw new Error('Event date is required.');
        }
        await dataConnection().schedule.setDate(date);
        const snapshot = parseScheduleFromBody(req.body);
        await dataConnection().schedule.set(snapshot);
        req.flash('success', 'Schedule updated.');
        res.redirect(302, '/admin/schedule');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save schedule.';
        req.flash('error', message);
        res.redirect(302, '/admin/schedule');
    }
});

export default router;

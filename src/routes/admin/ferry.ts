import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import type { FerryService, FerryServiceTo } from '../../data/def/types/FerryService';
import { fromTimeLocalValue, toTimeLocalValue } from '../../util/ferryAdminTime';

const router = express.Router();

type FerryFormRow = {
    to: FerryServiceTo;
    platform: string;
    via: string;
    time: string;
    arriving: string;
};

async function loadFormRows(): Promise<FerryFormRow[]> {
    const island = await dataConnection().ferryServices.getAll('island');
    const mainland = await dataConnection().ferryServices.getAll('mainland');
    const all = [...island, ...mainland].sort((a, b) => a.time.getTime() - b.time.getTime());
    return all.map((s) => ({
        to: s.to,
        platform: s.platform,
        via: s.via,
        time: toTimeLocalValue(s.time),
        arriving: toTimeLocalValue(s.arriving),
    }));
}

function normalizeServicesRows(raw: unknown): unknown[] {
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

function parseServicesFromBody(body: unknown): FerryService[] {
    const raw = body as Record<string, unknown>;
    const servicesRaw = normalizeServicesRows(raw.services);
    const out: FerryService[] = [];
    for (const row of servicesRaw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const platform = typeof r.platform === 'string' ? r.platform.trim() : '';
        const via = typeof r.via === 'string' ? r.via.trim() : '';
        const timeStr = typeof r.time === 'string' ? r.time.trim() : '';
        const arrivingStr = typeof r.arriving === 'string' ? r.arriving.trim() : '';
        if (!platform && !timeStr && !arrivingStr && !via) continue;
        const to = r.to === 'mainland' ? 'mainland' : 'island';
        if (!timeStr || !arrivingStr) {
            throw new Error('Each ferry row must include departure and arrival times.');
        }
        const time = fromTimeLocalValue(timeStr);
        let arriving = fromTimeLocalValue(arrivingStr);
        if (arriving.getTime() < time.getTime()) {
            arriving = new Date(arriving.getTime() + 24 * 60 * 60 * 1000);
        }
        if (!platform) {
            throw new Error('Each ferry row must include a platform.');
        }
        if (!via) {
            throw new Error('Each ferry row must include a via (route) label.');
        }
        out.push({ to, platform, via, time, arriving });
    }
    return out;
}

router.get('/', async (req, res, next) => {
    try {
        const ferryRows = await loadFormRows();
        res.render('pages/admin/ferry', {
            ferryRows,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const services = parseServicesFromBody(req.body);
        await dataConnection().ferryServices.replaceAll(services);
        req.flash('success', 'Ferry timetable updated.');
        res.redirect(302, '/admin/ferry');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save ferry timetable.';
        req.flash('error', message);
        try {
            const ferryRows = await loadFormRows();
            res.status(400).render('pages/admin/ferry', {
                ferryRows,
            });
        } catch {
            next(err);
        }
    }
});

export default router;

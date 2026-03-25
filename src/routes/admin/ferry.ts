import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { FerryService, FerryServiceTo } from '../../data/def/types/FerryService';

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
    return [...island, ...mainland]; // types area already each sorted
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

async function parseServicesFromBody(body: unknown): Promise<FerryService[]> {
    const eventDateYmd = await dataConnection().schedule.getDate();
    const raw = body as Record<string, unknown>;
    const servicesRaw = normalizeServicesRows(raw.services);
    const out: FerryService[] = [];
    for (const row of servicesRaw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const platform = typeof r.platform === 'string' ? r.platform.trim() : '';
        const via = typeof r.via === 'string' ? r.via.trim() : '';
        const time = typeof r.time === 'string' ? r.time.trim() : '';
        const arriving = typeof r.arriving === 'string' ? r.arriving.trim() : '';
        if (!platform && !time && !arriving && !via) continue;
        const to = r.to === 'mainland' ? 'mainland' : 'island';
        if (!time || !arriving) {
            throw new Error('Each ferry row must include departure and arrival times.');
        }
        if (!platform) {
            throw new Error('Each ferry row must include a platform.');
        }
        if (!via) {
            throw new Error('Each ferry row must include a via (route) label.');
        }
        out.push(new FerryService(to, platform, time, via, arriving));
    }
    return out;
}

router.get('/', async (req, res, next) => {
    try {
        const ferryRows = await loadFormRows();
        const ferry = dataConnection().ferryServices;
        const ferryTimetableLink = await ferry.getLink();
        const ferryCost = await ferry.getCost();
        res.render('pages/admin/ferry', {
            ferryRows,
            ferryTimetableLink,
            ferryCost,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const ferryTimetableLink = typeof req.body.ferryTimetableLink === 'string' ? req.body.ferryTimetableLink.trim() : '';
        const ferryCost = typeof req.body.ferryCost === 'string' ? req.body.ferryCost.trim() : '';
        const services = await parseServicesFromBody(req.body);
        const ferry = dataConnection().ferryServices;
        await ferry.setLink(ferryTimetableLink);
        await ferry.setCost(ferryCost);
        await ferry.replaceAll(services);
        req.flash('success', 'Ferry timetable updated.');
        res.redirect(302, '/admin/ferry');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save ferry timetable.';
        req.flash('error', message);
        res.redirect(302, '/admin/ferry');
    }
});

export default router;

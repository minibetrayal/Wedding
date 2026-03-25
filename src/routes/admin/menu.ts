import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { MenuItem, MenuTag } from '../../data/def/types/MenuItem';

const router = express.Router();

const VALID_TAGS = new Set<string>(Object.values(MenuTag));

function normalizeRows(raw: unknown): unknown[] {
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

function normalizeItemRows(raw: unknown): unknown[] {
    return normalizeRows(raw);
}

function asTrimmedString(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function tagsFromField(raw: unknown): MenuTag[] {
    if (raw === undefined || raw === null) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    const out: MenuTag[] = [];
    for (const x of list) {
        const s = asTrimmedString(x);
        if (!s) continue;
        if (!VALID_TAGS.has(s)) {
            throw new Error(`Unknown menu tag: ${s}`);
        }
        out.push(s as MenuTag);
    }
    return out;
}

function parseMenuFromBody(body: unknown): { name: string; items: MenuItem[] }[] {
    const rowsRaw = normalizeRows((body as Record<string, unknown>).courses);
    const courses: { name: string; items: MenuItem[] }[] = [];
    const seenNames = new Set<string>();

    for (const row of rowsRaw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const courseName = asTrimmedString(r.name);
        const itemRows = normalizeItemRows(r.items);
        const items: MenuItem[] = [];

        for (const ir of itemRows) {
            if (!ir || typeof ir !== 'object') continue;
            const item = ir as Record<string, unknown>;
            const itemName = asTrimmedString(item.name);
            const tags = tagsFromField(item.tags);
            if (!itemName && tags.length === 0) continue;
            if (!itemName) {
                throw new Error('Each menu line must have a dish name when tags are selected.');
            }
            items.push(new MenuItem(itemName, tags));
        }

        if (!courseName && items.length === 0) continue;
        if (!courseName) {
            throw new Error('Each course section must have a name when it contains dishes.');
        }
        if (seenNames.has(courseName)) {
            throw new Error(`Duplicate course name: ${courseName}`);
        }
        seenNames.add(courseName);
        courses.push({ name: courseName, items });
    }

    return courses;
}

router.get('/', async (req, res, next) => {
    try {
        const courses = await dataConnection().menu.getAll();
        const menuTags = Object.values(MenuTag);
        res.render('pages/admin/menu', { courses, menuTags });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const parsed = parseMenuFromBody(req.body);
        const menu = dataConnection().menu;
        const current = await menu.getAll();
        for (const c of current) {
            await menu.removeCourse(c.name);
        }
        for (const c of parsed) {
            await menu.createCourse(c.name);
            await menu.updateCourse(c.name, c.items);
        }
        req.flash('success', 'Menu updated.');
        res.redirect(302, '/admin/menu');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save menu.';
        req.flash('error', message);
        res.redirect(302, '/admin/menu');
    }
});

export default router;

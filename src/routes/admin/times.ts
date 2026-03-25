import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { Time, TimeType } from '../../data/def/types/Time';
import { camelToTitleCase } from '../../util/camelToTitleCase';

const router = express.Router();

type TimesBody = Record<string, { min?: unknown; max?: unknown } | undefined>;

router.get('/', async (req, res, next) => {
    try {
        const tim = dataConnection().times;
        const timeRows = await Promise.all(
            Object.values(TimeType).map(async (type: TimeType) => {
                const t = await tim.get(type);
                return {
                    type,
                    label: camelToTitleCase(type),
                    min: t.min,
                    max: t.max
                };
            }),
        );
        res.render('pages/admin/times', { timeRows });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const raw = req.body as { types?: TimesBody };
        const timesPayload = raw.types ?? {};
        const tim = dataConnection().times;
        for (const type of Object.values(TimeType)) {
            const cell = timesPayload[type];
            const min = typeof cell?.min === 'string' && cell.min.trim() ? parseInt(cell.min.trim(), 10) : 0;
            const max = typeof cell?.max === 'string' && cell.max.trim() ? parseInt(cell.max.trim(), 10) : undefined;
            await tim.set(type, new Time(min, max));
        }
        req.flash('success', 'Times updated.');
        res.redirect(302, '/admin/times');
    } catch (err) {
        next(err);
    }
});

export default router;
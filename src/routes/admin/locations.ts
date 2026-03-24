import express from 'express';

import { getDataConnection as dataConnection } from '../../data/def/DataConnection';
import { Location, LocationType } from '../../data/def/types/Location';
import { camelToTitleCase } from '../../util/camelToTitleCase';

const router = express.Router();

type LocationsBody = Record<string, { name?: unknown; address?: unknown } | undefined>;

router.get('/', async (req, res, next) => {
    try {
        const loc = dataConnection().locations;
        const locationRows = await Promise.all(
            Object.values(LocationType).map(async (type: LocationType) => {
                const l = await loc.get(type);
                return {
                    type,
                    label: camelToTitleCase(type),
                    name: l.name,
                    address: l.address ?? '',
                };
            }),
        );
        res.render('pages/admin/locations', { locationRows });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const raw = req.body as { locations?: LocationsBody };
        const locationsPayload = raw.locations ?? {};
        const loc = dataConnection().locations;
        for (const type of Object.values(LocationType)) {
            const cell = locationsPayload[type];
            const name = typeof cell?.name === 'string' ? cell.name.trim() : '';
            const address =
                typeof cell?.address === 'string' && cell.address.trim() ? cell.address.trim() : undefined;
            await loc.set(type, new Location(name, address));
        }
        req.flash('success', 'Locations updated.');
        res.redirect(302, '/admin/locations');
    } catch (err) {
        next(err);
    }
});

export default router;

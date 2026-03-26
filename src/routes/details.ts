import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { formatTimeStr } from '../util/timeUtils';
import { MenuTag } from '../data/def/types/MenuItem';

const router = express.Router();

router.get('/', async (req, res) => {
    const db = dataConnection();
    const [
        eventDate, toIsland, toMainland, cost, link, contactName, 
        contactPhone, contactEmail,schedule, locations, travelTimes, menu] =
        await Promise.all([
            db.schedule.getDate(),
            db.ferryServices.getAll('island'),
            db.ferryServices.getAll('mainland'),
            db.ferryServices.getCost(),
            db.ferryServices.getLink(),
            db.names.getContactName(),
            db.names.getContactPhone(),
            db.names.getContactEmail(),
            db.schedule.get(),
            db.locations.getAll(),
            db.times.getAll(),
            db.menu.getAll(),
        ]);

    res.render('pages/details', {
        ferryServices: {
            toIsland: toIsland.map((s) => ({
                ...s,
                formattedTime: formatTimeStr(eventDate, s.time),
                formattedArriving: formatTimeStr(eventDate, s.arriving),
            })),
            toMainland: toMainland.map((s) => ({
                ...s,
                formattedTime: formatTimeStr(eventDate, s.time),
                formattedArriving: formatTimeStr(eventDate, s.arriving),
            })),
            cost,
            link,
        },
        contactName,
        contactPhone,
        contactEmail,
        locations,
        schedule,
        travelTimes,
        menu,
        menuTags: Object.values(MenuTag),
    });
});

export default router;

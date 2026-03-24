import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { FerryService, FerryServiceTo } from '../data/def/types/FerryService';
import { enrichScheduleForTemplate } from '../util/scheduleDisplay';

const router = express.Router();

type TimedFerryService = FerryService & { timeStr?: string; arrivingStr?: string };

function formatTime(dateTime: Date, timezone?: string): string {
    return dateTime.toLocaleTimeString('en-AU', {
        timeStyle: 'short',
        timeZone: timezone || process.env.EVENT_TIMEZONE!,
    });
}

async function getFerryServices(to: FerryServiceTo): Promise<TimedFerryService[]> {
    return dataConnection()
        .ferryServices.getAll(to)
        .then((services) =>
            services.map((fs) => ({
                ...fs,
                timeStr: formatTime(fs.time),
                arrivingStr: formatTime(fs.arriving),
            })),
        );
}

router.get('/', async (req, res) => {
    const db = dataConnection();
    const eventDate = process.env.EVENT_DATE;
    const [toIsland, toMainland, cost, link, contactName, contactPhone, scheduleSnapshot, locations] =
        await Promise.all([
            getFerryServices('island'),
            getFerryServices('mainland'),
            db.ferryServices.getCost(),
            db.ferryServices.getLink(),
            db.names.getContactName(),
            db.names.getContactPhone(),
            db.schedule.get(),
            db.locations.getAll(),
        ]);
    const schedule = enrichScheduleForTemplate(scheduleSnapshot, eventDate);
    const { scheduledEvents, arrivalIndex, ceremonyIndex, receptionIndex, endOfDayIndex } = schedule;
    const ceremonyRawTime =
        scheduledEvents.length > 0 && ceremonyIndex >= 0 && ceremonyIndex < scheduledEvents.length
            ? scheduledEvents[ceremonyIndex].rawTime
            : undefined;

    res.render('pages/details', {
        ferryServices: {
            toIsland,
            toMainland,
            cost,
            link,
        },
        contactName,
        contactPhone,
        locations,
        scheduledEvents,
        scheduleArrivalIndex: arrivalIndex,
        scheduleCeremonyIndex: ceremonyIndex,
        scheduleReceptionIndex: receptionIndex,
        scheduleEndOfDayIndex: endOfDayIndex,
        ceremonyRawTime,
    });
});

export default router;

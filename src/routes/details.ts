import express from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { FerryService, FerryServiceTo } from '../data/def/types/FerryService';

const router = express.Router();

type TimedFerryService = FerryService & { timeStr?: string; arrivingStr?: string };

function formatTime(dateTime: Date, timezone?: string): string {
    return dateTime.toLocaleTimeString('en-AU', {
        timeStyle: 'short',
        timeZone: timezone || process.env.EVENT_TIMEZONE!
    });
}

async function getFerryServices(to: FerryServiceTo): Promise<TimedFerryService[]> {
    return dataConnection().ferryServices.getAll(to)
        .then(services => services.map(fs => ({
            ...fs, 
            timeStr: formatTime(fs.time),
            arrivingStr: formatTime(fs.arriving)
        })));
}

router.get('/', async (req, res) => {
    res.render('pages/details', {
        ferryServices: {
            toIsland: await getFerryServices('island'),
            toMainland: await getFerryServices('mainland'),
        }
    });
});

export default router;

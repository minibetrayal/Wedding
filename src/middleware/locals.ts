import express from 'express';

import { hasValidAdminCookie } from './adminAuth';
import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { LocationType } from '../data/def/types/Location';
import { formatDateStr, zonedToDate } from '../util/timeUtils';
import { GuestbookEntry } from '../data/def/types/GuestbookEntry';

export default async function locals(req: express.Request, res: express.Response, next: express.NextFunction) {
    const [heroPhotos, coupleNamesShort, coupleNames, eventDate, scheduleSnapshot, island, 
        guestbookEntries,
    ] = await Promise.all([
        dataConnection().photos.getAll('hero'),
        dataConnection().names.getNamesShort(),
        dataConnection().names.getNames(),
        dataConnection().schedule.getDate(),
        dataConnection().schedule.get(),
        dataConnection().locations.get(LocationType.island),
        dataConnection().guestbook.getAll(),
    ]);
    res.locals.heroImages =
        heroPhotos?.map((photo) => ({
            url: `/photos/${photo.id}`,
            style: photo.captionOrStyle,
        })) ?? [];
    res.locals.coupleNamesShort = coupleNamesShort;
    res.locals.coupleNames = coupleNames;
    res.locals.eventDateRaw = eventDate;
    res.locals.eventDateFormatted = formatDateStr(eventDate);
    res.locals.eventTZ = process.env.EVENT_TIMEZONE;
    res.locals.eventTZLabel = process.env.EVENT_TIMEZONE_LABEL;
    res.locals.islandName = island.name;

    res.locals.ceremonyDateTime = zonedToDate(eventDate, scheduleSnapshot.ceremony().time);

    res.locals.websiteUrl = process.env.WEBSITE_URL;

    res.locals.moderationEntries = guestbookEntries
        .filter((entry: GuestbookEntry) => entry.pendingRemoderation)
        .length;

    res.locals.isAdmin = hasValidAdminCookie(req);

    next();
}
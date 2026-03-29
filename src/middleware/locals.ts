import express from 'express';

import { hasValidAdminCookie } from './adminAuth';
import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { LocationType } from '../data/def/types/Location';
import { formatDateStr, zonedToDate } from '../util/timeUtils';
import { getRsvpCookie } from './rsvpCookie';

export default async function locals(req: express.Request, res: express.Response, next: express.NextFunction) {
    const db = dataConnection();
    const [heroPhotos, coupleNamesShort, coupleNames, contactEmail, eventDate, scheduleSnapshot, island, rsvpCloseDate] = await Promise.all([
        db.photos.getAll('hero'),
        db.settings.get('namesShort'),
        db.settings.get('names'),
        db.settings.get('contactEmail'),
        db.schedule.getDate(),
        db.schedule.get(),
        db.locations.get(LocationType.island),
        db.settings.get('rsvpCloseDate'),
    ]);
    res.locals.heroImages =
        heroPhotos?.map((photo) => ({
            url: `/photos/${photo.id}`,
            style: photo.captionOrStyle,
        })) ?? [];
    res.locals.coupleNamesShort = coupleNamesShort;
    res.locals.coupleNames = coupleNames;
    res.locals.contactEmail = contactEmail;

    res.locals.eventDateRaw = eventDate;
    res.locals.eventDateFormatted = formatDateStr(eventDate);
    res.locals.eventTZ = process.env.EVENT_TIMEZONE;
    res.locals.eventTZLabel = process.env.EVENT_TIMEZONE_LABEL;
    res.locals.islandName = island.name;

    res.locals.ceremonyDateTime = zonedToDate(eventDate, scheduleSnapshot.ceremony().time);

    res.locals.rsvpCloseDateRaw = rsvpCloseDate;
    res.locals.rsvpCloseDateFormatted = formatDateStr(rsvpCloseDate);

    res.locals.websiteUrl = process.env.WEBSITE_URL;

    const isAdmin = hasValidAdminCookie(req);
    const isRSVP = !!getRsvpCookie(req);



    if (isAdmin) {
        const remoderationCount = await dataConnection().guestbook.getRemoderationCount();
        res.locals.moderationEntries = remoderationCount;
    }

    res.locals.isAdmin = isAdmin;
    res.locals.isRSVP = isRSVP;

    next();
}
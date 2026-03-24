import express from 'express';

import { formatDate, getDateParts } from '../util/timeUtils';
import { parseScheduleTimeToDate } from '../util/scheduleDisplay';
import { hasValidAdminCookie } from './adminAuth';
import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { LocationType } from '../data/def/types/Location';

export default async function locals(req: express.Request, res: express.Response, next: express.NextFunction) {
    const [heroPhotos, coupleNamesShort, coupleNames, scheduleSnapshot, island] = await Promise.all([
        dataConnection().photos.getAll('hero'),
        dataConnection().names.getNamesShort(),
        dataConnection().names.getNames(),
        dataConnection().schedule.get(),
        dataConnection().locations.get(LocationType.island),
    ]);
    res.locals.heroImages =
        heroPhotos?.map((photo) => ({
            url: `/photos/${photo.id}`,
            style: photo.captionOrStyle,
        })) ?? [];
    res.locals.coupleNamesShort = coupleNamesShort;
    res.locals.coupleNames = coupleNames;

    if (process.env.EVENT_DATE) {
        const eventDate = process.env.EVENT_DATE;
        res.locals.eventDate = formatDate(eventDate);
        res.locals.eventDateParts = getDateParts(eventDate);

        if (process.env.EVENT_TIMEZONE_LABEL) res.locals.eventTimezoneLabel = process.env.EVENT_TIMEZONE_LABEL;
        if (process.env.EVENT_TIMEZONE) res.locals.eventTimezone = process.env.EVENT_TIMEZONE;

        const ceremony = scheduleSnapshot.events[scheduleSnapshot.ceremony];
        if (ceremony) {
            res.locals.ceremonyRawTime = parseScheduleTimeToDate(eventDate, ceremony.time);
        }
    }
    res.locals.islandName = island.name;

    for (let keyType of ['times']) {
        res.locals[keyType] = {};
        for (let key of Object.keys(process.env)) {
            if (!key || !process.env[key]) continue;
            if (key.startsWith(`${keyType.toUpperCase().slice(0, -1)}_`)) {
                const camelCase = key.replace(`${keyType.toUpperCase().slice(0, -1)}_`, '')
                    .split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
                const camelCaseKey = camelCase.charAt(0).toLowerCase() + camelCase.slice(1);
                res.locals[keyType][camelCaseKey] = process.env[key].replace(/''/g, "'");
            }
        }
    }
    // Public site origin (no trailing slash required) — QR codes, absolute links, etc.
    res.locals.websiteUrl = process.env.WEBSITE_URL;

    res.locals.receptionMenu = [];
    for (let key of Object.keys(process.env)) {
        if (!key || !process.env[key]) continue;
        if (key.startsWith('MENU_COURSE_')) {
            const courseName = process.env[key];
            const courseNameKey = `MENU_${courseName.toUpperCase().replace(/ /g, '_')}_`;
            const index = parseInt(key.replace('MENU_COURSE_', ''), 10);
            const items = [];
            for (let keyItem of Object.keys(process.env)) {
                if (!keyItem || !process.env[keyItem]) continue;
                if (keyItem.startsWith(courseNameKey)) {
                    items.push({index: parseInt(keyItem.replace(courseNameKey, ''), 10), value: process.env[keyItem]});
                }
            }
            items.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
            res.locals.receptionMenu.push({ name: courseName.replace(/_/g, ' '), items: items.map(item => item.value), index });
        }
    }
    res.locals.receptionMenu.sort((a: { index: number }, b: { index: number }) => a.index - b.index);

    res.locals.isAdmin = hasValidAdminCookie(req);

    next();
}
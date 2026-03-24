import express from 'express';

import { formatDate, formatTime, getDateParts } from '../util/timeUtils';
import { hasValidAdminCookie } from './adminAuth';
import { getDataConnection as dataConnection } from '../data/def/DataConnection';

type ScheduledEvent = {
    time: string;
    rawTime: Date;
    description: string;
    key: string;
}

export default async function locals(req: express.Request, res: express.Response, next: express.NextFunction) {
    res.locals.heroImages = await dataConnection().photos.getAll('hero')
        .then(photos => photos.map(photo => {
                return {
                    url: `/photos/${photo.id}`,
                    style: photo.captionOrStyle,
                };
            })) ?? [];

    if (process.env.EVENT_DATE) {
        res.locals.eventDate = formatDate(process.env.EVENT_DATE);
        res.locals.eventDateParts = getDateParts(process.env.EVENT_DATE);


        if (process.env.ARRIVAL_TIME_KEY) res.locals.arrivalTimeKey = process.env.ARRIVAL_TIME_KEY;
        if (process.env.CEREMONY_TIME_KEY) res.locals.ceremonyKey = process.env.CEREMONY_TIME_KEY;
        if (process.env.RECEPTION_TIME_KEY) res.locals.receptionKey = process.env.RECEPTION_TIME_KEY;
        
        if (process.env.EVENT_TIMEZONE_LABEL) res.locals.eventTimezoneLabel = process.env.EVENT_TIMEZONE_LABEL;
        if (process.env.EVENT_TIMEZONE) res.locals.eventTimezone = process.env.EVENT_TIMEZONE;

        res.locals.scheduledEvents = [];
        for (let key of Object.keys(process.env)) {
            if (!key || !process.env[key]) continue;
            if (key.startsWith('SCHEDULE_')) {
                res.locals.scheduledEvents.push({
                    time: formatTime(process.env.EVENT_DATE, process.env[key]),
                    rawTime: new Date(`${process.env.EVENT_DATE}T${process.env[key]}`),
                    description: key
                        .replace('SCHEDULE_', '')
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' '),
                    key: key
                });
            }
        }
        res.locals.scheduledEvents.sort((a: ScheduledEvent, b: ScheduledEvent) => a.rawTime.getTime() - b.rawTime.getTime());
    }
    for (let keyType of ['locations', 'links', 'times', 'costs']) {
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
    res.locals.coupleNamesShort = process.env.COUPLE_NAMES_SHORT;
    res.locals.coupleNames = process.env.COUPLE_NAMES;
    res.locals.contactName = process.env.CONTACT_NAME;
    res.locals.contactPhone = process.env.CONTACT_PHONE;

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
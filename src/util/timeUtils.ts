import { Temporal } from '@js-temporal/polyfill';

const timeZone = process.env.EVENT_TIMEZONE!;

export function formatDate(date: Date) : string {
    return date.toLocaleDateString('en-AU', {
        dateStyle: 'full',
        timeZone
    });
}

export function formatDateStr(date: string): string {
    return formatDate(zonedToDate(date, '00:00'));
}

export function formatYYYYMMDD(date: Date) : string {
    return date.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone
    });
}

export function formatTime(date: Date) : string {
    return date.toLocaleTimeString('en-AU', {
        timeStyle: 'short',
        timeZone
    });
}

export function formatTimeStr(date: string, time: string): string {
    return formatTime(zonedToDate(date, time));
}

export function formatDateTime(date: Date): string {
    return date.toLocaleString('en-AU', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone
    });
}

export function formatHHMM(date: Date) : string {
    return date.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
        timeZone
    });
}

export function zonedToDate(date: string, time: string): Date {
    if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Invalid date: ${date}`);
    if (!time?.match(/^\d{2}:\d{2}$/)) throw new Error(`Invalid time: ${time}`);
    return new Date(Temporal.PlainDateTime.from(`${date} ${time}:00`)
        .toZonedDateTime(timeZone).epochMilliseconds);
}
import type { ScheduleSnapshot } from '../data/def/types/ScheduledEvent';
import { formatTime } from './timeUtils';

/** Pad "HH:MM" to "HH:MM:00" for Date / formatTime parsing. */
export function normalizeScheduleTimeString(time: string): string {
    const t = time.trim();
    if (/^\d{1,2}:\d{2}$/.test(t)) {
        return `${t}:00`;
    }
    return t;
}

export function parseScheduleTimeToDate(eventDateYmd: string, time: string): Date {
    return new Date(`${eventDateYmd}T${normalizeScheduleTimeString(time)}`);
}

/** `value` for HTML `input type="time"` (24h HH:MM). */
export function normalizeTimeForTimeInput(time: string): string {
    const t = time.trim();
    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) {
        return '00:00';
    }
    let h = parseInt(m[1], 10);
    let min = parseInt(m[2], 10);
    if (!Number.isFinite(h) || !Number.isFinite(min)) {
        return '00:00';
    }
    h = Math.min(23, Math.max(0, h));
    min = Math.min(59, Math.max(0, min));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export type RichScheduledEvent = {
    time: string;
    rawTime: Date;
    description: string;
};

/** Build template-friendly schedule rows (formatted times + raw instants for countdown). */
export function enrichScheduleForTemplate(
    snapshot: ScheduleSnapshot,
    eventDateYmd: string | undefined,
): {
    scheduledEvents: RichScheduledEvent[];
    arrivalIndex: number;
    ceremonyIndex: number;
    receptionIndex: number;
    endOfDayIndex: number;
} {
    if (!eventDateYmd || snapshot.events.length === 0) {
        return {
            scheduledEvents: [],
            arrivalIndex: snapshot.arrival,
            ceremonyIndex: snapshot.ceremony,
            receptionIndex: snapshot.reception,
            endOfDayIndex: snapshot.endOfDay,
        };
    }
    const scheduledEvents: RichScheduledEvent[] = snapshot.events.map((e) => {
        const ts = normalizeScheduleTimeString(e.time);
        const rawTime = parseScheduleTimeToDate(eventDateYmd, e.time);
        return {
            time: formatTime(eventDateYmd, ts),
            rawTime,
            description: e.name,
        };
    });
    return {
        scheduledEvents,
        arrivalIndex: snapshot.arrival,
        ceremonyIndex: snapshot.ceremony,
        receptionIndex: snapshot.reception,
        endOfDayIndex: snapshot.endOfDay,
    };
}

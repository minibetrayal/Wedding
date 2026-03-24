/**
 * Ferry admin: wall-clock times in EVENT_TIMEZONE on EVENT_DATE ↔ absolute Date.
 */

function parseHm(s: string): { h: number; m: number } {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) {
        throw new Error(`Invalid time: ${s}`);
    }
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h < 0 || h > 23 || mi < 0 || mi > 59) {
        throw new Error(`Invalid time: ${s}`);
    }
    return { h, m: mi };
}

/** HH:mm for `<input type="time">`, representing the clock time in `timeZone` for this instant. */
export function toTimeLocalValue(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: process.env.EVENT_TIMEZONE!,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export function fromTimeLocalValue(timeHm: string): Date {
    const { h, m } = parseHm(timeHm);
    const eventDateYmd = process.env.EVENT_DATE?.trim();
    const [y, mo, d] = eventDateYmd?.split('-').map(Number) ?? [];

    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: process.env.EVENT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
    });

    const dayStartUtc = Date.parse(`${eventDateYmd}T00:00:00Z`);
    const lo = dayStartUtc - 48 * 60 * 60 * 1000;
    const hi = dayStartUtc + 72 * 60 * 60 * 1000;

    const matches: Date[] = [];
    for (let t = lo; t <= hi; t += 60 * 1000) {
        const inst = new Date(t);
        const parts = fmt.formatToParts(inst);
        const get = (type: string) => parts.find((p) => p.type === type)?.value;
        const yy = Number(get('year'));
        const MM = Number(get('month'));
        const dd = Number(get('day'));
        const HH = Number(get('hour'));
        const mm = Number(get('minute'));
        if (yy === y && MM === mo && dd === d && HH === h && mm === m) {
            matches.push(inst);
        }
    }

    if (matches.length === 0) {
        throw new Error(`Invalid time: ${timeHm} on ${eventDateYmd} in ${process.env.EVENT_TIMEZONE!}`);
    }
    return matches[0];
}

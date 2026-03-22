/** Non-negative integer for “seats we can offer”; capped for sanity. */
export function parseCarpoolSpotsOffered(raw: unknown): number {
    const n = parseInt(String(raw ?? '').trim(), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 50);
}

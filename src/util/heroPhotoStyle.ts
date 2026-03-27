/**
 * Hero photos store a CSS fragment in `captionOrStyle`, e.g.
 * `object-position: 50% 35%`, for use with `object-fit: cover` on a 16:9 carousel.
 * Horizontal position is always center (50%); only the vertical percentage is chosen in admin.
 */

/** Matches object-position with a vertical percentage (second value). */
const HERO_OBJECT_POSITION_Y_RE =
    /transform:\s*translateY\s*\(\s*([\d.]+(?:\.\d+)?%)\s*\)/i;

export function heroFocusYToCaptionOrStyle(fy: number): string {
    const yPct = Math.round(clamp01(fy) * 100);
    return `transform: translateY(${-yPct}%)`;
}

export function parseHeroFocusYFromCaptionOrStyle(captionOrStyle?: string): number | null {
    if (!captionOrStyle?.trim()) return null;
    const m = captionOrStyle.match(HERO_OBJECT_POSITION_Y_RE);
    if (!m) return null;
    const y = Number(m[1]) / 100;
    if (!Number.isFinite(y)) return null;
    return clamp01(-y);
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

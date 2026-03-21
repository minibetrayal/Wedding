import { createHash, timingSafeEqual } from 'crypto';

import type { NextFunction, Request, Response } from 'express';

/** Signed cookie name; value is a constant — tampering breaks the signature. */
const ADMIN_COOKIE_NAME = 'wedding_admin';
const ADMIN_COOKIE_VALUE = '1';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const adminCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
};

/**
 * Compare password to env using SHA-256 so we can use timingSafeEqual (fixed-length digests).
 */
export function verifyAdminPassword(input: string): boolean {
    const expected = process.env.ADMIN_PASSWORD;
    if (expected === undefined || expected.length === 0) return false;
    const a = createHash('sha256').update(input, 'utf8').digest();
    const b = createHash('sha256').update(expected, 'utf8').digest();
    return timingSafeEqual(a, b);
}

/**
 * Only allow relative redirects under /admin (avoid open redirects).
 */
export function safeAdminRedirectPath(next: unknown): string {
    if (Array.isArray(next)) next = next[0];
    if (typeof next !== 'string' || !next.startsWith('/admin')) return '/admin';
    if (next.startsWith('//') || /[\r\n]/.test(next)) return '/admin';
    return next;
}

/**
 * Check if the admin cookie is valid.
 */
export function hasValidAdminCookie(req: Request): boolean {
    return req.signedCookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}

/** Use after mounting GET/POST /login. Blocks all other /admin routes without a valid signed cookie. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (hasValidAdminCookie(req)) {
        next();
        return;
    }
    const nextParam = req.originalUrl || '/admin';
    const q = new URLSearchParams({ next: nextParam });
    res.redirect(302, `/admin/login?${q.toString()}`);
}

/**
 * Set the admin cookie.
 */
export function setAdminAuthCookie(res: Response): void {
    res.cookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
        ...adminCookieOptions,
        maxAge: TWELVE_HOURS_MS,
    });
}

/** Clear the admin session cookie (same path/options as when set). */
export function clearAdminAuthCookie(res: Response): void {
    res.clearCookie(ADMIN_COOKIE_NAME, adminCookieOptions);
}

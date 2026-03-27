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

type PostLoginRedirectRule = { isPrefix: boolean; path: string };

const ALLOWED_POST_LOGIN_REDIRECTS: PostLoginRedirectRule[] = [
    { isPrefix: true, path: '/admin' },
    { isPrefix: false, path: '/guestbook/moderation' },
    { isPrefix: true, path: '/photos' },
];

/**
 * Sanitize `next` after admin login (avoid open redirects). Only paths matching
 * {@link ALLOWED_POST_LOGIN_REDIRECTS} are returned; otherwise `/admin`.
 */
export function safeAdminRedirectPath(next: unknown): string {
    if (Array.isArray(next)) next = next[0];
    if (typeof next !== 'string' || /[\r\n]/.test(next)) return '/admin';
    if (next.startsWith('//')) return '/admin';
    for (const rule of ALLOWED_POST_LOGIN_REDIRECTS) {
        const typeOneResult = next === rule.path || next.startsWith(`${rule.path}?`);
        if (typeOneResult) return next;
        if (rule.isPrefix && next.startsWith(`${rule.path}/`)) return next;
    }
    return '/admin';
}

export function safeRedirectPath(next: unknown): string {
    if (Array.isArray(next)) next = next[0];

    if (typeof next !== 'string') return '/';

    // Reject CRLF injection
    if (/[\r\n]/.test(next)) return '/';

    // Must start with a single slash
    if (!next.startsWith('/')) return '/';

    // Reject protocol-relative URLs like //evil.com
    if (next.startsWith('//')) return '/';

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

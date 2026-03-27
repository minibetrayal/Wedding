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

function normalizeRedirectPath(next: unknown): string | null {
    if (!next) return null;
    const n: string = (Array.isArray(next)) ? next[0] : next;
    if (typeof n !== 'string') return null;
    return n;
}

function isSafeRedirectPath(next: string | null): boolean {
    if (!next) return false;
    if (/[\r\n]/.test(next)) return false;
    if (!next.startsWith('/')) return false;
    if (next.startsWith('//')) return false;
    return true;
}

function isSafeAdminRedirectPath(next: string | null): boolean {
    if (!isSafeRedirectPath(next)) return false;
    for (const rule of ALLOWED_POST_LOGIN_REDIRECTS) {
        if (next === rule.path || next!.startsWith(`${rule.path}?`)) return true;
        if (rule.isPrefix && next!.startsWith(`${rule.path}/`)) return true;
    }
    return false;
}

export function safeAdminRedirectPath(next: unknown): string {
    const n = normalizeRedirectPath(next);
    if (!isSafeAdminRedirectPath(n)) return '/admin';
    return n!;
}

export function safeRedirectPath(next: unknown): string {
    const n = normalizeRedirectPath(next);
    if (!isSafeRedirectPath(n)) return '/';
    return n!;
}

/**
 * Check if the admin cookie is valid.
 */
export function hasValidAdminCookie(req: Request): boolean {
    return req.signedCookies[ADMIN_COOKIE_NAME] === ADMIN_COOKIE_VALUE;
}

/** Use after mounting GET/POST /login. Blocks all other /admin routes without a valid signed cookie. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (hasValidAdminCookie(req)) return next();
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

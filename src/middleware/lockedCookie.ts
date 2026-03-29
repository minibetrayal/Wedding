import type { NextFunction, Request, Response } from 'express';
import { getDataConnection } from '../data/def/DataConnection';

const LOCKED_COOKIE_NAME = 'locked';

const lockedCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
};

export function setLockedCookie(res: Response): void {
    res.cookie(LOCKED_COOKIE_NAME, true, lockedCookieOptions);
}

export function clearLockedCookie(res: Response): void {
    res.clearCookie(LOCKED_COOKIE_NAME, lockedCookieOptions);
}

export function hasLockedCookie(req: Request): boolean {
    const v = req.signedCookies[LOCKED_COOKIE_NAME];
    return typeof v === 'string' ? v === 'true': false;
}

export async function isSiteLocked(): Promise<boolean> {
    return await getDataConnection().settings.get('siteLocked');
}

export async function requireLocked(req: Request, res: Response, next: NextFunction): Promise<void> {
    const nextParam = req.originalUrl || '/';
    if (hasLockedCookie(req) || !(await isSiteLocked())) return next();
    if (nextParam === '/') return res.redirect(302, '/locked');
    const q = new URLSearchParams({ next: nextParam });
    return res.redirect(302, `/locked/login?${q.toString()}`);
}
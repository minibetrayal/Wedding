import type { NextFunction, Request, Response } from 'express';
import { getDataConnection } from '../data/def/DataConnection';

/** Signed cookie: guestbook `Author.id` for this browser. */
const LOCKED_COOKIE_NAME = 'locked';

const lockedCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
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

export async function requireLocked(req: Request, res: Response, next: NextFunction): Promise<void> {
    const isLocked = await getDataConnection().settings.get('siteLocked');
    const hasCookie = hasLockedCookie(req);
    if (isLocked && !hasCookie) return res.render('locked');
    next();
}
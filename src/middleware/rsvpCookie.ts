import type { NextFunction, Request, Response } from 'express';

const RSVP_COOKIE_NAME = 'wedding_rsvp';
const FOUR_HUNDRED_DAYS_MS = 400 * 24 * 60 * 60 * 1000;

const rsvpCookieOptionsClear = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/rsvp',
    secure: process.env.NODE_ENV === 'production',
};

const rsvpCookieOptionsSet = {
    ...rsvpCookieOptionsClear,
    maxAge: FOUR_HUNDRED_DAYS_MS,
};

export function setRsvpCookie(res: Response, inviteId: string): void {
    res.cookie(RSVP_COOKIE_NAME, inviteId, rsvpCookieOptionsSet);
}

export function clearRsvpCookie(res: Response): void {
    res.clearCookie(RSVP_COOKIE_NAME, rsvpCookieOptionsClear);
}

/** Invite id from the RSVP cookie, if present and valid. */
export function getRsvpCookie(req: Request): string | undefined {
    const v = req.signedCookies[RSVP_COOKIE_NAME];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function refreshRsvpCookie(req: Request, res: Response, next: NextFunction) {
    const rsvpCookie = getRsvpCookie(req);
    if (rsvpCookie) setRsvpCookie(res, rsvpCookie);
    next();
}
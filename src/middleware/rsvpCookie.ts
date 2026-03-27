import type { Request, Response } from 'express';

/** Signed cookie: last opened RSVP invite id (session cookie, no maxAge). */
const RSVP_COOKIE_NAME = 'wedding_rsvp';

const rsvpCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/rsvp',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
};

export function setRsvpCookie(res: Response, inviteId: string): void {
    res.cookie(RSVP_COOKIE_NAME, inviteId, rsvpCookieOptions);
}

export function clearRsvpCookie(res: Response): void {
    res.clearCookie(RSVP_COOKIE_NAME, rsvpCookieOptions);
}

/** Invite id from the RSVP cookie, if present and valid. */
export function getRsvpCookie(req: Request): string | undefined {
    const v = req.signedCookies[RSVP_COOKIE_NAME];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

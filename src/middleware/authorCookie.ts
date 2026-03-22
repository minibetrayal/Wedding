import type { Request, Response } from 'express';

import type { Author } from '../data/types/Author';

/** Signed cookie: guestbook `Author.id` for this browser. */
const AUTHOR_COOKIE_NAME = 'guestbook_author';

const authorCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/guestbook',
    secure: process.env.NODE_ENV === 'production',
};

export function setAuthorCookie(res: Response, authorId: string): void {
    res.cookie(AUTHOR_COOKIE_NAME, authorId, authorCookieOptions);
}

export function clearAuthorCookie(res: Response): void {
    res.clearCookie(AUTHOR_COOKIE_NAME, authorCookieOptions);
}

/** `Author.id` from the cookie, if present and validly signed. */
export function getAuthorCookie(req: Request): string | undefined {
    const v = req.signedCookies[AUTHOR_COOKIE_NAME];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function isViewerAuthor(req: Request, authorId: string): boolean {
    const id = getAuthorCookie(req);
    return id !== undefined && id === authorId;
}

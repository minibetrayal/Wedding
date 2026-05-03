import type { NextFunction, Request, Response } from 'express';

/** Signed cookie: guestbook `Author.id` for this browser. */
const AUTHOR_COOKIE_NAME = 'guestbook_author';
const DISPLAY_NAME_COOKIE_NAME = 'guestbook_display_name';
const FOUR_HUNDRED_DAYS_MS = 400 * 24 * 60 * 60 * 1000;

const authorCookieOptionsClear = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/guestbook',
    secure: process.env.NODE_ENV === 'production',
};

const authorCookieOptionsSet = {
    ...authorCookieOptionsClear,
    maxAge: FOUR_HUNDRED_DAYS_MS,
}

const displayNameCookieOptionsClear = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/guestbook',
    secure: process.env.NODE_ENV === 'production',
};

const displayNameCookieOptionsSet = {
    ...displayNameCookieOptionsClear,
    maxAge: FOUR_HUNDRED_DAYS_MS,
}

export function setDisplayNameCookie(res: Response, displayName: string): void {
    res.cookie(DISPLAY_NAME_COOKIE_NAME, displayName, displayNameCookieOptionsSet);
}

export function getDisplayNameCookie(req: Request): string | undefined {
    const v = req.signedCookies[DISPLAY_NAME_COOKIE_NAME];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function setAuthorCookie(res: Response, authorId: string): void {
    res.cookie(AUTHOR_COOKIE_NAME, authorId, authorCookieOptionsSet);
}

export function clearAuthorCookie(res: Response): void {
    res.clearCookie(AUTHOR_COOKIE_NAME, authorCookieOptionsClear);
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

export function refreshDisplayNameCookie(req: Request, res: Response, next: NextFunction) {
    const displayNameCookie = getDisplayNameCookie(req);
    if (displayNameCookie) setDisplayNameCookie(res, displayNameCookie);
    next();
}

export function refreshAuthorCookie(req: Request, res: Response, next: NextFunction) {
    const authorCookie = getAuthorCookie(req);
    if (authorCookie) setAuthorCookie(res, authorCookie);
    next();
}
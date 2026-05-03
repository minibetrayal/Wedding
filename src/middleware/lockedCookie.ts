import type { NextFunction, Request, Response } from 'express';
import { getDataConnection } from '../data/def/DataConnection';

const LOCKED_COOKIE_NAME = 'locked';
const FOUR_HUNDRED_DAYS_MS = 400 * 24 * 60 * 60 * 1000;

const lockedCookieOptionsClear = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
};

const lockedCookieOptionsSet = {
    ...lockedCookieOptionsClear,
    maxAge: FOUR_HUNDRED_DAYS_MS,
};

export function setLockedCookie(res: Response): void {
    res.cookie(LOCKED_COOKIE_NAME, true, lockedCookieOptionsSet);
}

export function clearLockedCookie(res: Response): void {
    res.clearCookie(LOCKED_COOKIE_NAME, lockedCookieOptionsClear);
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

export function refreshLockedCookie(req: Request, res: Response, next: NextFunction) {
    if (hasLockedCookie(req)) setLockedCookie(res);
    next();
}
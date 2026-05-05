import crypto from 'crypto';

import type { NextFunction, Request, Response } from 'express';

const FLASH_COOKIE_NAME = 'flash';

const flashCookieOptionsClear = {
    signed: true,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
};

const flashCookieOptionsSet = {
    ...flashCookieOptionsClear,
    maxAge: 1000 * 10, // 10 seconds
};

const FLASH_BUCKETS = ['success', 'error', 'info'] as const;
type FlashBucket = (typeof FLASH_BUCKETS)[number];

function isFlashBucket(s: string): s is FlashBucket {
    return (FLASH_BUCKETS as readonly string[]).includes(s);
}

/**
 * Attaches `req.flash(type, message)` (sets signed flash cookies) and fills `res.locals.flash`
 * from any `flash-*` cookies on this request, then clears those cookies.
 */
export default function flashMiddleware(req: Request, res: Response, next: NextFunction): void {
    req.flash = (type: string, message: string) => {
        const uid = crypto.randomUUID();
        const payload = JSON.stringify({ type, message });
        res.cookie(`${FLASH_COOKIE_NAME}-${uid}`, payload, flashCookieOptionsSet);
    };

    const flashLocals: Record<FlashBucket, string[]> = {
        success: [],
        error: [],
        info: [],
    };

    const signed = req.signedCookies ?? {};
    for (const name of Object.keys(signed)) {
        if (!name.startsWith(`${FLASH_COOKIE_NAME}-`)) continue;
        const raw = signed[name];
        if (typeof raw !== 'string') {
            res.clearCookie(name, flashCookieOptionsClear);
            continue;
        }
        try {
            const parsed = JSON.parse(raw) as { type?: string; message?: string };
            if (typeof parsed.type === 'string' && typeof parsed.message === 'string' && isFlashBucket(parsed.type)) {
                flashLocals[parsed.type].push(parsed.message);
            }
        } catch {
            // ignore malformed payload
        }
        res.clearCookie(name, flashCookieOptionsClear);
    }

    res.locals.flash = flashLocals;
    next();
}

import express from 'express';

/**
 * Moves consumed flash messages from the session into res.locals for templates.
 * Call after connect-flash. Categories match req.flash('success' | 'error' | 'info').
 */
export default function flashLocals(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    res.locals.flash = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info'),
    };
    next();
}

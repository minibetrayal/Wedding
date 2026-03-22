import multer from 'multer';
import express from 'express';

/**
 * Thrown from multer `fileFilter` (etc.) for mistakes we want to explain with flash + redirect.
 * Any other `Error` from multer is treated as unexpected and passed to `next(err)` for the global handler.
 */
export class GuestbookUploadUserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GuestbookUploadUserError';
    }
}

/** Memory upload for guestbook post images (field name `photo`). */
const guestbookImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new GuestbookUploadUserError('Please choose an image file (e.g. JPEG or PNG).'));
        }
    },
});

export function uploadPhoto(redirectOnFailure: (req: express.Request) => string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        guestbookImageUpload.single('photo')(req, res, (err: unknown) => {
            if (err instanceof multer.MulterError) {
                req.flash('error', err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large.' : 'Upload failed.');
                return res.redirect(302, redirectOnFailure(req));
            }
            if (err instanceof GuestbookUploadUserError) {
                req.flash('error', err.message);
                return res.redirect(302, redirectOnFailure(req));
            }
            if (err instanceof Error) {
                return next(err);
            }
            if (err) {
                return next(new Error(String(err)));
            }
            next();
        });
    };
}
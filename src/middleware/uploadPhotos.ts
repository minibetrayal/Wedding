import express from 'express';
import multer from 'multer';

import { GuestbookUploadUserError } from './guestbookUpload';

const MAX_FILES = 40;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const photosUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter(_req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new GuestbookUploadUserError('Please choose image files only (e.g. JPEG or PNG).'));
        }
    },
});

/**
 * Memory upload for professional gallery images (field name `photos`, multiple files).
 */
export function uploadPhotos(redirectOnFailure: (req: express.Request) => string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        photosUpload.array('photos', MAX_FILES)(req, res, (err: unknown) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error', 'One or more images are too large (max 20 MB each).');
                } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    req.flash('error', `You can upload at most ${MAX_FILES} images at once.`);
                } else {
                    req.flash('error', 'Upload failed.');
                }
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

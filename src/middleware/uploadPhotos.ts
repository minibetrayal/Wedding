import express from 'express';
import multer from 'multer';

export const MAX_FILES = 40;
export const MAX_FILE_SIZE_MB = 20;

const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

class ImageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageError';
    }
}

const photosUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter(_req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new ImageError('Please choose image files only (e.g. JPEG or PNG).'));
        }
    },
});

function handler(err: unknown, isMultiple: boolean, redirectOnFailure: RedirectOnFailure) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        function errorRedirect(msg: string) {
            req.flash('error', msg);
            if (typeof redirectOnFailure === 'function') {
                return res.redirect(302, redirectOnFailure(req));
            } else {
                return res.redirect(302, redirectOnFailure);
            }
        }
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                if (isMultiple) return errorRedirect(`One or more images are too large (max ${MAX_FILE_SIZE_MB} MB each).`);
                else return errorRedirect(`Image is too large (max ${MAX_FILE_SIZE_MB} MB).`);
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                if (isMultiple) return errorRedirect(`You can upload at most ${MAX_FILES} images at once.`);
                else return errorRedirect('You can upload at most one image.');
            }
            return errorRedirect('Upload failed.');
        }
        if (err instanceof ImageError) return errorRedirect(err.message);
        if (err instanceof Error) return next(err);
        if (err) return next(new Error(String(err)));
        next();
    }
}

type RedirectOnFailure = string | ((req: express.Request) => string);

export class Upload {

    static multiple(field: string, redirectOnFailure: RedirectOnFailure) {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            photosUpload.array(field, MAX_FILES)(req, res, (err: unknown) => handler(err, true, redirectOnFailure)(req, res, next));
        };
    }

    static single(field: string, redirectOnFailure: RedirectOnFailure) {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            photosUpload.single(field)(req, res, (err: unknown) => handler(err, false, redirectOnFailure)(req, res, next));
        };
    }
}
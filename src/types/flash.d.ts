/** Flash API provided by {@link ../middleware/flashMiddleware.ts}. */
declare global {
    namespace Express {
        interface Request {
            flash(type: string, message: string): void;
        }
    }
}

export {};

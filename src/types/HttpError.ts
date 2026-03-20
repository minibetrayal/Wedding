const defaultMessage = 'Something went wrong';

export class HttpError extends Error {
    status: number;
    context?: Record<string, unknown>;

    constructor(status: number, message?: string, context?: Record<string, unknown>) {
        super(message ?? defaultMessage);
        this.status = status;
        this.context = context;
    }

    isPublic(): boolean {
        return this.status >= 400 && this.status < 500;
    }
}

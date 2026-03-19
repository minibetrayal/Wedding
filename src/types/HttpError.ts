const defaultMessage = 'Something went wrong';

export class HttpError extends Error {
    status: number;
    context?: Record<string, unknown>;

    constructor(status: number, message?: string, context?: Record<string, unknown>) {
        super(message ?? defaultMessage);
        this.status = status;
        // if (context != null) this.context = context;
        // else 
        this.context = { testing: 'testing', number: 123, object: { nested: 'nested' }, array: [1, 2, 3] };
    }

    isPublic(): boolean {
        return this.status >= 400 && this.status < 500;
    }
}

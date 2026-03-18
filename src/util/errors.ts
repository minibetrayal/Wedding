export class HttpError extends Error {
    status: number;
    context?: Record<string, unknown>;

    constructor(status: number, message?: string, context?: Record<string, unknown>) {
        super(message ?? defaultMessages[status] ?? `Error ${status}`);
        this.status = status;
        if (context != null) this.context = context;
    }

    isPublic(): boolean {
        return this.status >= 400 && this.status < 500;
    }
}

const defaultMessages: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  500: 'Internal server error',
};

/**
 * Creates an error with a status code for the HTTP error handler.
 * Optionally include context that can be passed to the error view.
 */
export function createHttpError(
  status: number,
  message?: string,
  context?: Record<string, unknown>
): HttpError {
  return new HttpError(status, message, context);
}

export class DbNotFoundError extends Error {
    constructor(itemType: string) {
        super(`${itemType} not found`);
        this.name = 'DbNotFoundError';
    }
}

export class DbError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DbError';
    }
}

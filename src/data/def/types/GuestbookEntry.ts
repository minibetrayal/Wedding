import { Author } from "./Author";
import { Photo } from "./Photo";

export class GuestbookEntry {
    id: string;
    author: Author;
    displayName?: string;
    visible: boolean;
    created: Date;
    updated: Date;
    content?: string;
    photo?: Photo;

    moderated: boolean = false;
    moderationReason?: string;
    pendingRemoderation: boolean = false;

    constructor(id: string, author: Author, visible: boolean, content?: string, displayName?: string, photo?: Photo) {
        this.id = id;
        this.author = author;
        this.visible = visible;
        this.content = content;
        this.displayName = displayName;
        this.photo = photo;
        this.created = new Date();
        this.updated = this.created;
    }

    formatCreated(): string {
        return this.created.toLocaleString('en-AU', { timeZone: process.env.EVENT_TIMEZONE, dateStyle: 'short', timeStyle: 'short' });
    }

    formatUpdated(): string {
        return this.updated.toLocaleString('en-AU', { timeZone: process.env.EVENT_TIMEZONE, dateStyle: 'short', timeStyle: 'short' });
    }
}

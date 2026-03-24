import { GuestbookEntry } from "../types/GuestbookEntry";
import { Author } from "../types/Author";
import { Photo } from "../types/Photo";

export interface GuestbookConnection {
    get(entryId: string): Promise<GuestbookEntry>;
    getAll(): Promise<GuestbookEntry[]>;
    create(author: Author, visible: boolean, content?: string, displayName?: string, photo?: Photo): Promise<GuestbookEntry>;
    delete(entryId: string): Promise<void>;
    update(entryId: string, visible: boolean, content?: string, displayName?: string, photo?: Photo): Promise<void>;
    hide(entryId: string, moderationReason?: string, automoderated?: boolean): Promise<void>;
    show(entryId: string): Promise<void>;
}
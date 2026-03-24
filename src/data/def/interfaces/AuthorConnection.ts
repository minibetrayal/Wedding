import { Author } from "../types/Author";

export interface AuthorConnection {
    get(authorId: string): Promise<Author>;
    getAll(): Promise<Author[]>;
    create(): Promise<Author>;
}
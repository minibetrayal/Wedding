import { Faq } from "../types/Faq";

export interface FaqConnection {
    get(id: string): Promise<Faq>;
    getAll(): Promise<Faq[]>;
    create(question: string, answer: string): Promise<Faq>;
    update(id: string, question: string, answer: string): Promise<void>;
    delete(id: string): Promise<void>;
    move(id: string, direction: 'up' | 'down'): Promise<void>;
}
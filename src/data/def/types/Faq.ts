export class Faq {
    /** Set when loaded from the database (omitted for new rows before insert). */
    id: string;
    question: string;
    answer: string;
    sortKey: number;

    constructor(id: string, question: string, answer: string, sortKey: number) {
        this.id = id;
        this.question = question;
        this.answer = answer;
        this.sortKey = sortKey;
    }
}
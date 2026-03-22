export class Photo {
    id: string;
    name: string;
    mimeType: string;
    updated: Date = new Date();

    constructor(id: string, name: string, mimeType: string) {
        this.id = id;
        this.name = name;
        this.mimeType = mimeType;
    }

    filename(): string {
        if (this.name.includes('.')) {
            return `${this.id}.${this.name.split('.').pop()}`;
        }
        return this.id;
    }
}
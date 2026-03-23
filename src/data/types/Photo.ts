export class Photo {
    id: string;
    name: string;
    mimeType: string;
    updated: Date = new Date();
    professional: boolean = false;
    caption?: string;

    constructor(id: string, name: string, mimeType: string, professional: boolean = false, caption?: string) {
        this.id = id;
        this.name = name;
        this.mimeType = mimeType;
        this.professional = professional;
        this.caption = caption;
    }

    filename(): string {
        if (this.name.includes('.')) {
            return `${this.id}.${this.name.split('.').pop()}`;
        }
        return this.id;
    }
}
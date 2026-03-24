export type PhotoType = 'professional' | 'guestbook' | 'hero';

export class Photo {
    id: string;
    name: string;
    mimeType: string;
    created: Date = new Date();
    updated: Date = new Date();
    type: PhotoType;
    captionOrStyle?: string;

    constructor(id: string, name: string, mimeType: string, type: PhotoType = 'guestbook', captionOrStyle?: string) {
        this.id = id;
        this.name = name;
        this.mimeType = mimeType;
        this.type = type;
        this.captionOrStyle = captionOrStyle;
    }

    filename(): string {
        if (this.name.includes('.')) {
            return `${this.id}.${this.name.split('.').pop()}`;
        }
        return this.id;
    }
}
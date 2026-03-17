export class Photo {
    name: string;
    url: string;
    mimeType: string;

    constructor(name: string, url: string, mimeType: string) {
        this.name = name;
        this.url = url;
        this.mimeType = mimeType;
    }
}
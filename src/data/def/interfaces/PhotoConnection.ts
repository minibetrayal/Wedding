import { Photo, PhotoType } from "../types/Photo";

export interface PhotoConnection {
    get(photoId: string): Promise<Photo>;
    getAll(type: PhotoType): Promise<Photo[]>;
    getPhoto(photoId: string): Promise<Buffer>;
    create(name: string, mimeType: string, data: Buffer, type?: PhotoType, captionOrStyle?: string): Promise<Photo>;
    delete(photoId: string): Promise<void>;
    updateCaptionOrStyle(photoId: string, captionOrStyle?: string): Promise<void>;
    move(id: string, direction: 'up' | 'down'): Promise<void>;
}
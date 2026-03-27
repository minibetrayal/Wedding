import { Photo } from "../types/Photo";

export interface PhotoStorageConnection {
    save(photo: Photo, data: Buffer): Promise<void>;
    get(photo: Photo): Promise<Buffer>;
    delete(photo: Photo): Promise<void>;
}
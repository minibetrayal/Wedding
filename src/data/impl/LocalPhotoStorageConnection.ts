import path from "path";
import fs from "fs";
import { PhotoStorageConnection } from "../def/interfaces/PhotoStorageConnection";
import { Photo } from "../def/types/Photo";

const PHOTOS_DIR = 'photos';

export class LocalPhotoStorageConnection implements PhotoStorageConnection {
    private readonly photosDir: string = path.resolve(process.cwd(), PHOTOS_DIR);

    async save(photo: Photo, data: Buffer): Promise<void> {
        await fs.promises.mkdir(this.photosDir, { recursive: true });
        const filePath = path.join(this.photosDir, photo.filename());
        await fs.promises.writeFile(filePath, data);
    }

    async get(photo: Photo): Promise<Buffer> {
        const filePath = path.join(this.photosDir, photo.filename());
        return await fs.promises.readFile(filePath);
    }

    async delete(photo: Photo): Promise<void> {
        const filePath = path.join(this.photosDir, photo.filename());
        await fs.promises.unlink(filePath).catch(() => { /* ignore if file missing */ });
    }
}       
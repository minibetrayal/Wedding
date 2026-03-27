import { DbError, DbNotFoundError } from "../dbErrors";
import { PhotoStorageConnection } from "../def/interfaces/PhotoStorageConnection";
import { Photo } from "../def/types/Photo";
import AWS from "aws-sdk";

export class S3PhotoStorageConnection implements PhotoStorageConnection {
    private readonly s3: AWS.S3;
    private readonly bucketName: string;

    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.BUCKETEER_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY!,
            region: process.env.BUCKETEER_AWS_REGION!,
        });
        this.bucketName = process.env.BUCKETEER_BUCKET_NAME!;
    }

    async save(photo: Photo, data: Buffer): Promise<void> {
        await this.s3.upload({
            Bucket: this.bucketName,
            Key: photo.id,
            Body: data,
            ContentType: photo.mimeType,
        })
        .promise()
        .then(() => undefined)
        .catch(error => {
            if (error.code === 'InvalidArgument') throw new DbError('Invalid photo data');
            throw error;
        });
    }   

    async get(photo: Photo): Promise<Buffer> {
        return this.s3.getObject({
            Bucket: this.bucketName,
            Key: photo.id,
        })
        .promise()
        .then(response => response.Body as Buffer)
        .catch(error => {
            if (error.code === 'NoSuchKey') throw new DbNotFoundError('Photo');
            throw error;
        });
    }

    async delete(photo: Photo): Promise<void> {
        return this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: photo.id,
        })
        .promise()
        .then(() => undefined)
        .catch(error => {
            if (error.code === 'NoSuchKey') throw new DbNotFoundError('Photo');
            throw error;
        });
    }
}
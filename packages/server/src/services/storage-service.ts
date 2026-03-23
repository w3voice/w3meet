// packages/server/src/services/storage-service.ts
import { Client as MinioClient } from "minio";
import { config } from "../config.js";
import { RECORDING_DOWNLOAD_TTL_SECONDS } from "@w3-meet/shared";

const minio = new MinioClient({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: false,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export async function ensureBuckets(): Promise<void> {
  for (const bucket of [config.minio.bucketRecordings, config.minio.bucketArtifacts]) {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, "us-east-1");
    }
  }
}

export async function getPresignedUrl(
  bucket: string,
  key: string,
  ttl = RECORDING_DOWNLOAD_TTL_SECONDS
): Promise<string> {
  return minio.presignedGetObject(bucket, key, ttl);
}

export async function uploadBuffer(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await minio.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
}

export async function listObjects(bucket: string, prefix: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const stream = minio.listObjects(bucket, prefix, true);
    stream.on("data", (obj) => { if (obj.name) keys.push(obj.name); });
    stream.on("end", () => resolve(keys));
    stream.on("error", reject);
  });
}

export { minio };

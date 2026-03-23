import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import { config } from "../config.js";
import { MAX_CONCURRENT_RECORDINGS } from "@w3-meet/shared";

const egressClient = new EgressClient(
  config.livekit.url.replace("ws", "http"),
  config.livekit.apiKey,
  config.livekit.apiSecret
);

const activeRecordings = new Map<string, string>();

export async function startRecording(roomId: string): Promise<{ egressId: string }> {
  if (activeRecordings.size >= MAX_CONCURRENT_RECORDINGS) {
    throw new Error("Max concurrent recordings reached");
  }
  if (activeRecordings.has(roomId)) {
    throw new Error("Recording already active for this room");
  }

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${roomId}/{time}.mp4`,
    output: {
      case: "s3",
      value: {
        accessKey: config.minio.accessKey,
        secret: config.minio.secretKey,
        region: "us-east-1",
        endpoint: `http://${config.minio.endpoint}:${config.minio.port}`,
        bucket: config.minio.bucketRecordings,
        forcePathStyle: true,
      },
    },
  });

  const info = await egressClient.startRoomCompositeEgress(roomId, { file: output });
  activeRecordings.set(roomId, info.egressId);
  return { egressId: info.egressId };
}

export async function stopRecording(roomId: string): Promise<void> {
  const egressId = activeRecordings.get(roomId);
  if (!egressId) throw new Error("No active recording for this room");
  await egressClient.stopEgress(egressId);
  activeRecordings.delete(roomId);
}

export function isRecording(roomId: string): boolean {
  return activeRecordings.has(roomId);
}

import { Router } from "express";
import type { RoomService } from "../services/room-service.js";
import { getPresignedUrl, listObjects } from "../services/storage-service.js";
import { startRecording, stopRecording, isRecording } from "../services/recording-service.js";
import { config } from "../config.js";

export function createRecordingsRouter(roomService: RoomService): Router {
  const router = Router();

  router.post("/:id/recordings/start", async (req, res) => {
    try {
      const room = await roomService.getRoom(req.params.id);
      if (!room) { res.status(404).json({ error: "Room not found" }); return; }
      const result = await startRecording(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/:id/recordings/stop", async (req, res) => {
    try {
      await stopRecording(req.params.id);
      res.json({ status: "stopped" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/:id/recordings/status", async (req, res) => {
    res.json({ recording: isRecording(req.params.id) });
  });

  router.get("/:id/recordings", async (req, res) => {
    try {
      const room = await roomService.getRoom(req.params.id);
      if (!room) { res.status(404).json({ error: "Room not found" }); return; }
      const keys = await listObjects(config.minio.bucketRecordings, `${req.params.id}/`);
      const recordings = await Promise.all(
        keys.map(async (key) => ({
          key,
          url: await getPresignedUrl(config.minio.bucketRecordings, key),
        }))
      );
      res.json(recordings);
    } catch (err) {
      res.status(500).json({ error: "Failed to list recordings" });
    }
  });

  return router;
}

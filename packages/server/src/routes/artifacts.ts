import { Router } from "express";
import { uploadBuffer, getPresignedUrl } from "../services/storage-service.js";
import { config } from "../config.js";

export function createArtifactsRouter(): Router {
  const router = Router();

  router.post("/:id/artifacts", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, filename, content, contentType } = req.body;

      if (!type || !filename || !content) {
        res.status(400).json({ error: "type, filename, content are required" });
        return;
      }

      const key = `${id}/${type}-${Date.now()}-${filename}`;
      const buffer = Buffer.from(content, "base64");
      await uploadBuffer(config.minio.bucketArtifacts, key, buffer, contentType || "application/octet-stream");

      const url = await getPresignedUrl(config.minio.bucketArtifacts, key);
      res.status(201).json({ key, url });
    } catch (err) {
      res.status(500).json({ error: "Failed to upload artifact" });
    }
  });

  return router;
}

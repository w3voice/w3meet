import { Router } from "express";
import type { RoomService } from "../services/room-service.js";
import { generateToken } from "../services/livekit-service.js";

export function createTokensRouter(roomService: RoomService): Router {
  const router = Router();

  router.post("/:id/token", async (req, res) => {
    try {
      const { id } = req.params;
      const { participantName, hostKey } = req.body;

      if (!participantName || typeof participantName !== "string") {
        res.status(400).json({ error: "participantName is required" });
        return;
      }

      const room = await roomService.getRoom(id);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }

      const isHost = hostKey ? await roomService.validateHostKey(id, hostKey) : false;
      const tokenResponse = await generateToken(id, participantName, isHost);
      res.json(tokenResponse);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  return router;
}

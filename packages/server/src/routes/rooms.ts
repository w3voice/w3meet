import { Router } from "express";
import type { RoomService } from "../services/room-service.js";

export function createRoomsRouter(roomService: RoomService): Router {
  const router = Router();

  router.post("/", async (_req, res) => {
    try {
      const room = await roomService.createRoom();
      res.status(201).json({ id: room.id, hostKey: room.hostKey });
    } catch (err) {
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const room = await roomService.getRoom(req.params.id);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      const { hostKey, ...publicRoom } = room;
      res.json(publicRoom);
    } catch (err) {
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  return router;
}

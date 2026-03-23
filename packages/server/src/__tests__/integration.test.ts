import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { RoomService } from "../services/room-service.js";
import { createRoomsRouter } from "../routes/rooms.js";

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string, ..._args: any[]) => { store.set(k, v); return "OK"; },
    del: async (k: string) => { store.delete(k); return 1; },
    exists: async (k: string) => store.has(k) ? 1 : 0,
    keys: async () => [...store.keys()],
  } as any;
}

describe("Integration: Room lifecycle", () => {
  const roomService = new RoomService(createMockRedis());
  const app = express();
  app.use(express.json());
  app.use("/api/rooms", createRoomsRouter(roomService));

  it("full flow: create → get → verify", async () => {
    const createRes = await request(app).post("/api/rooms");
    expect(createRes.status).toBe(201);
    const { id, hostKey } = createRes.body;

    const getRes = await request(app).get(`/api/rooms/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
    expect(getRes.body.hostKey).toBeUndefined();

    const isValid = await roomService.validateHostKey(id, hostKey);
    expect(isValid).toBe(true);
  });

  it("returns 404 for non-existent room", async () => {
    const res = await request(app).get("/api/rooms/nonexistent");
    expect(res.status).toBe(404);
  });
});

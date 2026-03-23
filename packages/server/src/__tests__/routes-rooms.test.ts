import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createRoomsRouter } from "../routes/rooms.js";
import { RoomService } from "../services/room-service.js";

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

describe("POST /api/rooms", () => {
  it("creates a room and returns id + hostKey", async () => {
    const roomService = new RoomService(createMockRedis());
    const app = express();
    app.use("/api/rooms", createRoomsRouter(roomService));

    const res = await request(app).post("/api/rooms");
    expect(res.status).toBe(201);
    expect(res.body.id).toHaveLength(10);
    expect(res.body.hostKey).toHaveLength(20);
  });
});

describe("GET /api/rooms/:id", () => {
  it("returns room info without hostKey", async () => {
    const roomService = new RoomService(createMockRedis());
    const app = express();
    app.use("/api/rooms", createRoomsRouter(roomService));

    const createRes = await request(app).post("/api/rooms");
    const res = await request(app).get(`/api/rooms/${createRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createRes.body.id);
    expect(res.body.hostKey).toBeUndefined();
  });

  it("returns 404 for non-existent room", async () => {
    const roomService = new RoomService(createMockRedis());
    const app = express();
    app.use("/api/rooms", createRoomsRouter(roomService));

    const res = await request(app).get("/api/rooms/nonexistent");
    expect(res.status).toBe(404);
  });
});

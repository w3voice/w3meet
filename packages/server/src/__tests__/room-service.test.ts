import { describe, it, expect, beforeEach } from "vitest";
import { RoomService } from "../services/room-service.js";

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string, _ex?: string, _ttl?: number) => { store.set(k, v); return "OK"; },
    del: async (k: string) => { store.delete(k); return 1; },
    exists: async (k: string) => store.has(k) ? 1 : 0,
    keys: async (pattern: string) => {
      const prefix = pattern.replace("*", "");
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    },
  };
}

describe("RoomService", () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService(createMockRedis() as any);
  });

  it("creates a room and returns id + hostKey", async () => {
    const room = await service.createRoom();
    expect(room.id).toHaveLength(10);
    expect(room.hostKey).toHaveLength(20);
    expect(room.status).toBe("created");
  });

  it("getRoom returns the created room", async () => {
    const created = await service.createRoom();
    const fetched = await service.getRoom(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it("getRoom returns null for non-existent room", async () => {
    const room = await service.getRoom("nonexistent");
    expect(room).toBeNull();
  });

  it("validateHostKey returns true for correct key", async () => {
    const room = await service.createRoom();
    expect(await service.validateHostKey(room.id, room.hostKey)).toBe(true);
  });

  it("validateHostKey returns false for wrong key", async () => {
    const room = await service.createRoom();
    expect(await service.validateHostKey(room.id, "wrongkey")).toBe(false);
  });

  it("deleteRoom removes the room", async () => {
    const room = await service.createRoom();
    await service.deleteRoom(room.id);
    expect(await service.getRoom(room.id)).toBeNull();
  });
});

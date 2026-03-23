import { nanoid } from "nanoid";
import type { Redis } from "ioredis";
import { ROOM_ID_LENGTH, HOST_KEY_LENGTH } from "@w3-meet/shared";
import type { RoomInfo } from "@w3-meet/shared";

const ROOM_PREFIX = "room:";
const ROOM_TTL = 24 * 60 * 60;

export class RoomService {
  constructor(private redis: Redis) {}

  async createRoom(): Promise<RoomInfo> {
    const id = nanoid(ROOM_ID_LENGTH);
    const hostKey = nanoid(HOST_KEY_LENGTH);
    const room: RoomInfo = {
      id,
      hostKey,
      createdAt: Date.now(),
      status: "created",
      participantCount: 0,
      recordingActive: false,
    };
    await this.redis.set(
      `${ROOM_PREFIX}${id}`,
      JSON.stringify(room),
      "EX",
      ROOM_TTL
    );
    return room;
  }

  async getRoom(id: string): Promise<RoomInfo | null> {
    const data = await this.redis.get(`${ROOM_PREFIX}${id}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async updateRoom(id: string, updates: Partial<RoomInfo>): Promise<void> {
    const room = await this.getRoom(id);
    if (!room) return;
    const updated = { ...room, ...updates };
    await this.redis.set(
      `${ROOM_PREFIX}${id}`,
      JSON.stringify(updated),
      "EX",
      ROOM_TTL
    );
  }

  async validateHostKey(id: string, hostKey: string): Promise<boolean> {
    const room = await this.getRoom(id);
    if (!room) return false;
    return room.hostKey === hostKey;
  }

  async deleteRoom(id: string): Promise<void> {
    await this.redis.del(`${ROOM_PREFIX}${id}`);
  }
}

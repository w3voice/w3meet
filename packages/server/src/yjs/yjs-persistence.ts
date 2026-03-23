import * as Y from "yjs";
import type { Redis } from "ioredis";

const YJS_PREFIX = "yjs:";

export class YjsRedisPersistence {
  constructor(private redis: Redis) {}

  async loadDoc(docName: string, ydoc: Y.Doc): Promise<void> {
    const data = await this.redis.getBuffer(`${YJS_PREFIX}${docName}`);
    if (data) {
      const update = new Uint8Array(data);
      Y.applyUpdate(ydoc, update);
    }
  }

  async storeDoc(docName: string, ydoc: Y.Doc): Promise<void> {
    const update = Y.encodeStateAsUpdate(ydoc);
    await this.redis.set(
      `${YJS_PREFIX}${docName}`,
      Buffer.from(update),
      "EX",
      24 * 60 * 60
    );
  }

  async deleteDoc(docName: string): Promise<void> {
    await this.redis.del(`${YJS_PREFIX}${docName}`);
  }
}

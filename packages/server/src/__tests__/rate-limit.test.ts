import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter } from "../middleware/rate-limit.js";

describe("rate-limit", () => {
  it("allows requests under the limit", async () => {
    const store = new Map<string, number[]>();
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000, store });
    const app = express();
    app.use(limiter);
    app.get("/test", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });

  it("blocks requests over the limit", async () => {
    const store = new Map<string, number[]>();
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000, store });
    const app = express();
    app.use(limiter);
    app.get("/test", (_req, res) => res.json({ ok: true }));

    await request(app).get("/test");
    await request(app).get("/test");
    const res = await request(app).get("/test");
    expect(res.status).toBe(429);
  });
});

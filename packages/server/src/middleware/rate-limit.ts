import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  store?: Map<string, number[]>;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const store = opts.store ?? new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    const timestamps = (store.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= opts.maxRequests) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    timestamps.push(now);
    store.set(key, timestamps);
    next();
  };
}

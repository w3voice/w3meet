# W3-Meet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted Zoom alternative with video/audio, screen sharing, cloud recording, whiteboard, collaborative docs, and Rustpad — optimized for connectivity with RU/BY via TURN relay.

**Architecture:** Monorepo (pnpm workspaces) with React SPA frontend, Node.js/Express backend, LiveKit for WebRTC, Yjs for real-time collaboration (whiteboard + docs), Rustpad as a separate container. All services orchestrated via Docker Compose.

**Tech Stack:** Vite, React 18, TypeScript, LiveKit (server + components-react), Express, Yjs, y-websocket, Excalidraw, TipTap, Rustpad, Redis, MinIO, Docker Compose, Nginx, coturn.

**Spec:** `docs/superpowers/specs/2026-03-23-w3-meet-design.md`

---

## File Structure

```
W3-Meet/
├── package.json                          # pnpm workspaces root
├── pnpm-workspace.yaml                   # workspace config
├── .gitignore
├── .env.example                          # environment variables template
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   │       ├── types.ts                  # Room, Participant, ChatMessage types
│   │       └── constants.ts              # Room limits, TTLs, config defaults
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Express app entry, HTTP + WS server
│   │       ├── config.ts                 # Env var loading and validation
│   │       ├── routes/
│   │       │   ├── rooms.ts              # POST /api/rooms, GET /api/rooms/:id
│   │       │   ├── tokens.ts             # POST /api/rooms/:id/token
│   │       │   ├── recordings.ts         # POST start/stop, GET list/download
│   │       │   └── artifacts.ts          # POST upload, GET download (whiteboard/docs/code)
│   │       ├── services/
│   │       │   ├── room-service.ts       # Room CRUD, lifecycle, host_key validation
│   │       │   ├── livekit-service.ts    # Token generation, room management via SDK
│   │       │   ├── recording-service.ts  # Egress API wrapper, MinIO upload
│   │       │   ├── storage-service.ts    # MinIO client, pre-signed URLs
│   │       │   └── turn-service.ts       # TURN credential generation (HMAC)
│   │       ├── yjs/
│   │       │   ├── yjs-server.ts         # y-websocket server setup, doc routing
│   │       │   └── yjs-persistence.ts    # Redis snapshot (save/load Yjs docs)
│   │       ├── middleware/
│   │       │   └── rate-limit.ts         # IP-based rate limiting
│   │       └── lib/
│   │           └── redis.ts              # Redis client singleton
│   ├── client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx                  # React entry
│   │       ├── App.tsx                   # Router: / and /room/:roomId
│   │       ├── api/
│   │       │   └── client.ts             # Fetch wrapper for backend API
│   │       ├── pages/
│   │       │   ├── HomePage.tsx           # Landing page with "Create Room" button
│   │       │   ├── RoomPage.tsx           # Main room page — orchestrates all panels
│   │       │   └── PreJoinPage.tsx        # Name entry before joining room
│   │       ├── components/
│   │       │   ├── room/
│   │       │   │   ├── VideoGrid.tsx      # LiveKit video tiles grid/speaker layout
│   │       │   │   ├── ControlBar.tsx     # Bottom bar: mic, cam, share, record, tools
│   │       │   │   ├── ParticipantList.tsx# Left sidebar participant list
│   │       │   │   ├── ChatPanel.tsx      # Chat via LiveKit Data Messages
│   │       │   │   └── RecordingIndicator.tsx # Red REC dot
│   │       │   ├── whiteboard/
│   │       │   │   └── WhiteboardPanel.tsx# Excalidraw + Yjs sync
│   │       │   ├── docs/
│   │       │   │   └── DocsPanel.tsx      # TipTap + Yjs collaboration
│   │       │   ├── code/
│   │       │   │   └── CodePanel.tsx      # Rustpad iframe wrapper
│   │       │   └── ui/
│   │       │       ├── ToolTabs.tsx        # Tab switcher: whiteboard/docs/code
│   │       │       └── SplitLayout.tsx     # Resizable split view (video | tool panel)
│   │       ├── hooks/
│   │       │   ├── useRoom.ts             # Room state, join/leave logic
│   │       │   ├── useChat.ts             # Send/receive chat messages via data channel
│   │       │   ├── useRecording.ts        # Start/stop recording, status polling
│   │       │   └── useYjsProvider.ts      # Yjs WebSocket provider + awareness
│   │       └── styles/
│   │           └── globals.css            # Global styles, CSS variables
├── docker/
│   ├── docker-compose.yml                # Primary: all services
│   ├── docker-compose.dev.yml            # Dev overrides (hot reload, no TLS)
│   ├── docker-compose.relay.yml          # Relay: coturn + nginx
│   ├── livekit.yaml                      # LiveKit server config
│   ├── nginx.conf                        # Reverse proxy config
│   ├── nginx.dev.conf                    # Dev nginx (no TLS)
│   ├── coturn.conf                       # TURN server config
│   ├── redis.conf                        # Redis config
│   └── Dockerfile.server                 # Node.js backend image
└── docs/
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`
- Create: `packages/shared/package.json`, `packages/shared/src/types.ts`, `packages/shared/src/constants.ts`
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`
- Create: `packages/client/package.json`, `packages/client/tsconfig.json`, `packages/client/vite.config.ts`, `packages/client/index.html`

- [ ] **Step 1: Initialize git repo**

```bash
cd D:/Projects/W3-Meet
git init
```

- [ ] **Step 2: Create root package.json and pnpm workspace**

`package.json`:
```json
{
  "name": "w3-meet",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint"
  },
  "engines": {
    "node": ">=20"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules/
dist/
.env
*.log
.DS_Store
```

- [ ] **Step 4: Create .env.example**

```env
# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_RECORDINGS=recordings
MINIO_BUCKET_ARTIFACTS=artifacts

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173

# TURN
TURN_SECRET=turnsecret
TURN_SERVER=turn:localhost:3478
TURN_TLS_SERVER=turns:localhost:5349
```

- [ ] **Step 5: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@w3-meet/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {}
}
```

`packages/shared/src/types.ts`:
```typescript
export interface RoomInfo {
  id: string;
  hostKey: string;
  createdAt: number;
  status: "created" | "active" | "idle" | "terminated";
  participantCount: number;
  recordingActive: boolean;
}

export interface TokenRequest {
  roomId: string;
  participantName: string;
  hostKey?: string;
}

export interface TokenResponse {
  token: string;
  isHost: boolean;
  iceServers: IceServer[];
}

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface ArtifactInfo {
  id: string;
  roomId: string;
  type: "recording" | "whiteboard" | "document" | "code";
  filename: string;
  url: string;
  createdAt: number;
  expiresAt: number;
}
```

`packages/shared/src/constants.ts`:
```typescript
export const ROOM_ID_LENGTH = 10;
export const HOST_KEY_LENGTH = 20;
export const MAX_PARTICIPANTS = 30;
export const ROOM_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
export const TOKEN_TTL_SECONDS = 4 * 60 * 60; // 4 hours
export const TURN_CREDENTIAL_TTL_SECONDS = 6 * 60 * 60; // 6 hours
export const YJS_SNAPSHOT_INTERVAL_MS = 30 * 1000; // 30s
export const RECORDING_DOWNLOAD_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const MAX_CONCURRENT_RECORDINGS = 2;
export const RATE_LIMIT_ROOMS_PER_HOUR = 10;
export const RATE_LIMIT_API_PER_MINUTE = 100;
```

`packages/shared/src/index.ts`:
```typescript
export * from "./types.js";
export * from "./constants.js";
```

- [ ] **Step 6: Create server package skeleton**

`packages/server/package.json`:
```json
{
  "name": "@w3-meet/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@w3-meet/shared": "workspace:*",
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "nanoid": "^5.0.0",
    "ioredis": "^5.4.0",
    "livekit-server-sdk": "^2.9.0",
    "minio": "^8.0.0",
    "ws": "^8.18.0",
    "y-websocket": "^2.0.0",
    "yjs": "^13.6.0",
    "lib0": "^0.2.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.0",
    "@types/ws": "^8.5.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create client package skeleton**

`packages/client/package.json`:
```json
{
  "name": "@w3-meet/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "@livekit/components-react": "^2.7.0",
    "livekit-client": "^2.6.0",
    "@excalidraw/excalidraw": "^0.17.0",
    "@tiptap/react": "^2.10.0",
    "@tiptap/starter-kit": "^2.10.0",
    "@tiptap/extension-collaboration": "^2.10.0",
    "@tiptap/extension-collaboration-cursor": "^2.10.0",
    "@tiptap/extension-table": "^2.10.0",
    "@tiptap/extension-table-row": "^2.10.0",
    "@tiptap/extension-table-cell": "^2.10.0",
    "@tiptap/extension-table-header": "^2.10.0",
    "@tiptap/extension-task-list": "^2.10.0",
    "@tiptap/extension-task-item": "^2.10.0",
    "@tiptap/extension-code-block-lowlight": "^2.10.0",
    "@tiptap/extension-image": "^2.10.0",
    "yjs": "^13.6.0",
    "y-websocket": "^2.0.0",
    "nanoid": "^5.0.0",
    "lowlight": "^3.1.0",
    "@livekit/components-styles": "^1.1.0",
    "@w3-meet/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

`packages/client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/client/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/yjs": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/pad": "http://localhost:3030",
    },
  },
});
```

`packages/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>W3-Meet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Install dependencies and verify workspace**

```bash
pnpm install
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with shared, server, and client packages"
```

---

## Task 2: Docker Infrastructure

**Files:**
- Create: `docker/docker-compose.yml`, `docker/docker-compose.dev.yml`, `docker/livekit.yaml`, `docker/nginx.dev.conf`, `docker/redis.conf`, `docker/Dockerfile.server`

- [ ] **Step 1: Create LiveKit config**

`docker/livekit.yaml`:
```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
keys:
  devkey: devsecret
logging:
  level: info
room:
  max_participants: 30
  empty_timeout: 300
turn:
  enabled: false
```

- [ ] **Step 2: Create Redis config**

`docker/redis.conf`:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 60 1000
```

- [ ] **Step 3: Create dev Nginx config**

`docker/nginx.dev.conf`:
```nginx
upstream backend {
    server backend:3001;
}

upstream livekit {
    server livekit:7880;
}

upstream rustpad {
    server rustpad:3030;
}

server {
    listen 80;

    # Frontend (dev server proxied separately via Vite)

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Yjs WebSocket
    location /yjs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Rustpad
    location /pad/ {
        proxy_pass http://rustpad/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # LiveKit WebSocket
    location /rtc {
        proxy_pass http://livekit;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 4: Create Dockerfile for server**

`docker/Dockerfile.server`:
```dockerfile
FROM node:20-slim AS base
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

WORKDIR /app/packages/server
RUN pnpm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 5: Create docker-compose.yml (primary)**

`docker/docker-compose.yml`:
```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
      - "50000-50020:50000-50020/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    command: ["--config", "/etc/livekit.yaml"]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped

  rustpad:
    image: ekzhang/rustpad:latest
    ports:
      - "3030:3030"
    restart: unless-stopped

  egress:
    image: livekit/egress:latest
    environment:
      EGRESS_CONFIG_FILE: /etc/egress.yaml
    volumes:
      - ./egress.yaml:/etc/egress.yaml
    depends_on:
      - livekit
      - minio
    restart: unless-stopped

volumes:
  redis-data:
  minio-data:
```

- [ ] **Step 6: Create egress config**

`docker/egress.yaml`:
```yaml
log_level: info
api_key: devkey
api_secret: devsecret
ws_url: ws://livekit:7880
s3:
  access_key: minioadmin
  secret: minioadmin
  region: us-east-1
  endpoint: http://minio:9000
  bucket: recordings
  force_path_style: true
```

- [ ] **Step 7: Create docker-compose.dev.yml (dev overrides)**

`docker/docker-compose.dev.yml`:
```yaml
services:
  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.server
    ports:
      - "3001:3001"
    environment:
      LIVEKIT_API_KEY: devkey
      LIVEKIT_API_SECRET: devsecret
      LIVEKIT_URL: ws://livekit:7880
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET_RECORDINGS: recordings
      MINIO_BUCKET_ARTIFACTS: artifacts
      PORT: "3001"
      CORS_ORIGIN: http://localhost:5173
      TURN_SECRET: turnsecret
    depends_on:
      - livekit
      - redis
      - minio
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.dev.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - livekit
      - rustpad
    restart: unless-stopped
```

- [ ] **Step 8: Verify docker compose config**

```bash
cd D:/Projects/W3-Meet/docker && docker compose -f docker-compose.yml -f docker-compose.dev.yml config > /dev/null && echo "Config valid"
```

- [ ] **Step 9: Commit**

```bash
cd D:/Projects/W3-Meet && git add docker/ && git commit -m "infra: add Docker Compose configs for LiveKit, Redis, MinIO, Rustpad, Egress"
```

---

## Task 3: Backend — Config, Redis, Rate Limiting

**Files:**
- Create: `packages/server/src/config.ts`, `packages/server/src/lib/redis.ts`, `packages/server/src/middleware/rate-limit.ts`
- Test: `packages/server/src/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write config.ts**

```typescript
// packages/server/src/config.ts
function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  livekit: {
    apiKey: required("LIVEKIT_API_KEY"),
    apiSecret: required("LIVEKIT_API_SECRET"),
    url: required("LIVEKIT_URL"),
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucketRecordings: process.env.MINIO_BUCKET_RECORDINGS || "recordings",
    bucketArtifacts: process.env.MINIO_BUCKET_ARTIFACTS || "artifacts",
  },

  turn: {
    secret: process.env.TURN_SECRET || "turnsecret",
    server: process.env.TURN_SERVER || "turn:localhost:3478",
    tlsServer: process.env.TURN_TLS_SERVER || "turns:localhost:5349",
  },
};
```

- [ ] **Step 2: Write Redis client**

```typescript
// packages/server/src/lib/redis.ts
import Redis from "ioredis";
import { config } from "../config.js";

export const redis = new Redis(config.redis.url);
```

- [ ] **Step 3: Write failing test for rate limiter**

```typescript
// packages/server/src/__tests__/rate-limit.test.ts
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
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd D:/Projects/W3-Meet && pnpm --filter @w3-meet/server test -- --run
```
Expected: FAIL — module not found

- [ ] **Step 5: Implement rate limiter**

```typescript
// packages/server/src/middleware/rate-limit.ts
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
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd D:/Projects/W3-Meet && pnpm --filter @w3-meet/server test -- --run
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/config.ts packages/server/src/lib/redis.ts packages/server/src/middleware/rate-limit.ts packages/server/src/__tests__/rate-limit.test.ts
git commit -m "feat(server): add config, redis client, and rate limiter with tests"
```

---

## Task 4: Backend — Room Service

**Files:**
- Create: `packages/server/src/services/room-service.ts`
- Test: `packages/server/src/__tests__/room-service.test.ts`

- [ ] **Step 1: Write failing tests for room service**

```typescript
// packages/server/src/__tests__/room-service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { RoomService } from "../services/room-service.js";

// In-memory Redis mock
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @w3-meet/server test -- --run
```

- [ ] **Step 3: Implement room service**

```typescript
// packages/server/src/services/room-service.ts
import { nanoid } from "nanoid";
import type { Redis } from "ioredis";
import { ROOM_ID_LENGTH, HOST_KEY_LENGTH } from "@w3-meet/shared";
import type { RoomInfo } from "@w3-meet/shared";

const ROOM_PREFIX = "room:";
const ROOM_TTL = 24 * 60 * 60; // 24h max room lifetime

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @w3-meet/server test -- --run
```

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/room-service.ts packages/server/src/__tests__/room-service.test.ts
git commit -m "feat(server): add room service with create/get/validate/delete"
```

---

## Task 5: Backend — LiveKit Service + TURN Credentials

**Files:**
- Create: `packages/server/src/services/livekit-service.ts`, `packages/server/src/services/turn-service.ts`
- Test: `packages/server/src/__tests__/turn-service.test.ts`

- [ ] **Step 1: Write failing test for TURN credential generation**

```typescript
// packages/server/src/__tests__/turn-service.test.ts
import { describe, it, expect } from "vitest";
import { generateTurnCredentials } from "../services/turn-service.js";

describe("TurnService", () => {
  it("generates time-limited HMAC credentials", () => {
    const creds = generateTurnCredentials("testuser", "testsecret", 3600);
    expect(creds.username).toContain(":");
    expect(creds.credential).toBeTruthy();
    expect(typeof creds.credential).toBe("string");
  });

  it("username contains expiry timestamp", () => {
    const creds = generateTurnCredentials("testuser", "testsecret", 3600);
    const [expiry] = creds.username.split(":");
    const expiryNum = parseInt(expiry, 10);
    expect(expiryNum).toBeGreaterThan(Date.now() / 1000);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Implement TURN credential service**

```typescript
// packages/server/src/services/turn-service.ts
import { createHmac } from "node:crypto";

export function generateTurnCredentials(
  username: string,
  secret: string,
  ttlSeconds: number
): { username: string; credential: string } {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const turnUsername = `${expiry}:${username}`;
  const hmac = createHmac("sha1", secret);
  hmac.update(turnUsername);
  const credential = hmac.digest("base64");
  return { username: turnUsername, credential };
}
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Implement LiveKit service**

```typescript
// packages/server/src/services/livekit-service.ts
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { config } from "../config.js";
import { generateTurnCredentials } from "./turn-service.js";
import { TOKEN_TTL_SECONDS, TURN_CREDENTIAL_TTL_SECONDS } from "@w3-meet/shared";
import type { TokenResponse, IceServer } from "@w3-meet/shared";

const roomClient = new RoomServiceClient(
  config.livekit.url.replace("ws", "http"),
  config.livekit.apiKey,
  config.livekit.apiSecret
);

export async function generateToken(
  roomId: string,
  participantName: string,
  isHost: boolean
): Promise<TokenResponse> {
  const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: participantName,
    ttl: TOKEN_TTL_SECONDS,
    metadata: JSON.stringify({ isHost }),
  });

  token.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
  });

  const turnCreds = generateTurnCredentials(
    participantName,
    config.turn.secret,
    TURN_CREDENTIAL_TTL_SECONDS
  );

  const iceServers: IceServer[] = [
    { urls: [`stun:${config.turn.server.replace("turn:", "")}`] },
    {
      urls: [config.turn.server, config.turn.tlsServer],
      username: turnCreds.username,
      credential: turnCreds.credential,
    },
  ];

  return {
    token: await token.toJwt(),
    isHost,
    iceServers,
  };
}

export { roomClient };
```

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/services/livekit-service.ts packages/server/src/services/turn-service.ts packages/server/src/__tests__/turn-service.test.ts
git commit -m "feat(server): add LiveKit token generation and TURN credential service"
```

---

## Task 6: Backend — Storage Service (MinIO)

**Files:**
- Create: `packages/server/src/services/storage-service.ts`

- [ ] **Step 1: Implement storage service**

```typescript
// packages/server/src/services/storage-service.ts
import { Client as MinioClient } from "minio";
import { config } from "../config.js";
import { RECORDING_DOWNLOAD_TTL_SECONDS } from "@w3-meet/shared";

const minio = new MinioClient({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: false,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export async function ensureBuckets(): Promise<void> {
  for (const bucket of [config.minio.bucketRecordings, config.minio.bucketArtifacts]) {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, "us-east-1");
    }
  }
}

export async function getPresignedUrl(
  bucket: string,
  key: string,
  ttl = RECORDING_DOWNLOAD_TTL_SECONDS
): Promise<string> {
  return minio.presignedGetObject(bucket, key, ttl);
}

export async function uploadBuffer(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await minio.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
}

export async function listObjects(bucket: string, prefix: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const stream = minio.listObjects(bucket, prefix, true);
    stream.on("data", (obj) => { if (obj.name) keys.push(obj.name); });
    stream.on("end", () => resolve(keys));
    stream.on("error", reject);
  });
}

export { minio };
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/services/storage-service.ts
git commit -m "feat(server): add MinIO storage service"
```

---

## Task 7: Backend — API Routes + Express App

**Files:**
- Create: `packages/server/src/routes/rooms.ts`, `packages/server/src/routes/tokens.ts`, `packages/server/src/routes/recordings.ts`, `packages/server/src/routes/artifacts.ts`, `packages/server/src/index.ts`
- Test: `packages/server/src/__tests__/routes-rooms.test.ts`

- [ ] **Step 1: Write failing test for rooms route**

```typescript
// packages/server/src/__tests__/routes-rooms.test.ts
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
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Implement rooms router**

```typescript
// packages/server/src/routes/rooms.ts
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
```

- [ ] **Step 4: Implement tokens router**

```typescript
// packages/server/src/routes/tokens.ts
import { Router } from "express";
import type { RoomService } from "../services/room-service.js";
import { generateToken } from "../services/livekit-service.js";

export function createTokensRouter(roomService: RoomService): Router {
  const router = Router();

  // POST /api/rooms/:id/token
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
```

- [ ] **Step 5: Implement recording service**

```typescript
// packages/server/src/services/recording-service.ts
import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import { config } from "../config.js";
import { MAX_CONCURRENT_RECORDINGS } from "@w3-meet/shared";

const egressClient = new EgressClient(
  config.livekit.url.replace("ws", "http"),
  config.livekit.apiKey,
  config.livekit.apiSecret
);

// Track active recordings by room ID
const activeRecordings = new Map<string, string>(); // roomId -> egressId

export async function startRecording(roomId: string): Promise<{ egressId: string }> {
  if (activeRecordings.size >= MAX_CONCURRENT_RECORDINGS) {
    throw new Error("Max concurrent recordings reached");
  }
  if (activeRecordings.has(roomId)) {
    throw new Error("Recording already active for this room");
  }

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${roomId}/{time}.mp4`,
    output: {
      case: "s3",
      value: {
        accessKey: config.minio.accessKey,
        secret: config.minio.secretKey,
        region: "us-east-1",
        endpoint: `http://${config.minio.endpoint}:${config.minio.port}`,
        bucket: config.minio.bucketRecordings,
        forcePathStyle: true,
      },
    },
  });

  const info = await egressClient.startRoomCompositeEgress(roomId, { file: output });
  activeRecordings.set(roomId, info.egressId);
  return { egressId: info.egressId };
}

export async function stopRecording(roomId: string): Promise<void> {
  const egressId = activeRecordings.get(roomId);
  if (!egressId) throw new Error("No active recording for this room");
  await egressClient.stopEgress(egressId);
  activeRecordings.delete(roomId);
}

export function isRecording(roomId: string): boolean {
  return activeRecordings.has(roomId);
}
```

- [ ] **Step 6: Implement recordings router**

```typescript
// packages/server/src/routes/recordings.ts
import { Router } from "express";
import type { RoomService } from "../services/room-service.js";
import { getPresignedUrl, listObjects } from "../services/storage-service.js";
import { startRecording, stopRecording, isRecording } from "../services/recording-service.js";
import { config } from "../config.js";

export function createRecordingsRouter(roomService: RoomService): Router {
  const router = Router();

  // POST /api/rooms/:id/recordings/start
  router.post("/:id/recordings/start", async (req, res) => {
    try {
      const room = await roomService.getRoom(req.params.id);
      if (!room) { res.status(404).json({ error: "Room not found" }); return; }
      const result = await startRecording(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/rooms/:id/recordings/stop
  router.post("/:id/recordings/stop", async (req, res) => {
    try {
      await stopRecording(req.params.id);
      res.json({ status: "stopped" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/rooms/:id/recordings/status
  router.get("/:id/recordings/status", async (req, res) => {
    res.json({ recording: isRecording(req.params.id) });
  });

  // GET /api/rooms/:id/recordings
  router.get("/:id/recordings", async (req, res) => {
    try {
      const room = await roomService.getRoom(req.params.id);
      if (!room) { res.status(404).json({ error: "Room not found" }); return; }

      const keys = await listObjects(config.minio.bucketRecordings, `${req.params.id}/`);
      const recordings = await Promise.all(
        keys.map(async (key) => ({
          key,
          url: await getPresignedUrl(config.minio.bucketRecordings, key),
        }))
      );
      res.json(recordings);
    } catch (err) {
      res.status(500).json({ error: "Failed to list recordings" });
    }
  });

  return router;
}
```

- [ ] **Step 6: Implement artifacts router**

```typescript
// packages/server/src/routes/artifacts.ts
import { Router } from "express";
import { uploadBuffer, getPresignedUrl } from "../services/storage-service.js";
import { config } from "../config.js";

export function createArtifactsRouter(): Router {
  const router = Router();

  // POST /api/rooms/:id/artifacts
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
```

- [ ] **Step 7: Implement Express app entry point**

```typescript
// packages/server/src/index.ts
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { config } from "./config.js";
import { redis } from "./lib/redis.js";
import { RoomService } from "./services/room-service.js";
import { createRoomsRouter } from "./routes/rooms.js";
import { createTokensRouter } from "./routes/tokens.js";
import { createRecordingsRouter } from "./routes/recordings.js";
import { createArtifactsRouter } from "./routes/artifacts.js";
import { setupYjsServer } from "./yjs/yjs-server.js";
import { ensureBuckets } from "./services/storage-service.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { RATE_LIMIT_ROOMS_PER_HOUR, RATE_LIMIT_API_PER_MINUTE } from "@w3-meet/shared";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));

const roomService = new RoomService(redis);

const roomRateLimit = createRateLimiter({
  maxRequests: RATE_LIMIT_ROOMS_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});

const apiRateLimit = createRateLimiter({
  maxRequests: RATE_LIMIT_API_PER_MINUTE,
  windowMs: 60 * 1000,
});

app.use("/api", apiRateLimit);
app.post("/api/rooms", roomRateLimit);
app.use("/api/rooms", createRoomsRouter(roomService));
app.use("/api/rooms", createTokensRouter(roomService));
app.use("/api/rooms", createRecordingsRouter(roomService));
app.use("/api/rooms", createArtifactsRouter());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = createServer(app);

// Yjs WebSocket server mounted at /yjs
setupYjsServer(server, redis);

async function start() {
  await ensureBuckets();
  server.listen(config.port, () => {
    console.log(`W3-Meet server listening on port ${config.port}`);
  });
}

start().catch(console.error);
```

- [ ] **Step 8: Run tests to verify rooms route tests pass**

```bash
pnpm --filter @w3-meet/server test -- --run
```

- [ ] **Step 9: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add API routes (rooms, tokens, recordings, artifacts) and Express app"
```

---

## Task 8: Backend — Yjs WebSocket Server with Redis Persistence

**Files:**
- Create: `packages/server/src/yjs/yjs-server.ts`, `packages/server/src/yjs/yjs-persistence.ts`

- [ ] **Step 1: Implement Yjs Redis persistence**

```typescript
// packages/server/src/yjs/yjs-persistence.ts
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
```

- [ ] **Step 2: Implement Yjs WebSocket server**

```typescript
// packages/server/src/yjs/yjs-server.ts
import { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { setupWSConnection, docs as ywsDocs } from "y-websocket/bin/utils";
import type { Redis } from "ioredis";
import { YjsRedisPersistence } from "./yjs-persistence.js";
import { YJS_SNAPSHOT_INTERVAL_MS } from "@w3-meet/shared";

export function setupYjsServer(server: HttpServer, redis: Redis): void {
  const wss = new WebSocketServer({ noServer: true });
  const persistence = new YjsRedisPersistence(redis);

  // y-websocket exposes a `docs` Map<string, WSSharedDoc> internally.
  // We use it for periodic snapshots instead of maintaining our own map.

  // Periodic snapshot to Redis
  const snapshotInterval = setInterval(async () => {
    for (const [name, doc] of ywsDocs) {
      try {
        await persistence.storeDoc(name, doc);
      } catch (err) {
        console.error(`Failed to snapshot Yjs doc ${name}:`, err);
      }
    }
  }, YJS_SNAPSHOT_INTERVAL_MS);

  // Restore doc from Redis on first connection
  const originalSetupWSConnection = setupWSConnection;

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/yjs")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const docName = url.pathname.replace("/yjs/", "");

    // If this doc is not yet loaded, restore from Redis
    if (!ywsDocs.has(docName)) {
      const tempDoc = new Y.Doc();
      await persistence.loadDoc(docName, tempDoc);
      // setupWSConnection will create the shared doc; we apply the saved state after
    }

    setupWSConnection(ws, req, { docName, gc: true });

    // Apply persisted state to the newly created shared doc
    const sharedDoc = ywsDocs.get(docName);
    if (sharedDoc) {
      await persistence.loadDoc(docName, sharedDoc);
    }
  });

  // Cleanup on server close
  server.on("close", () => {
    clearInterval(snapshotInterval);
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/yjs/
git commit -m "feat(server): add Yjs WebSocket server with Redis snapshot persistence"
```

---

## Task 9: Frontend — Shell, Routing, Landing Page

**Files:**
- Create: `packages/client/src/main.tsx`, `packages/client/src/App.tsx`, `packages/client/src/styles/globals.css`
- Create: `packages/client/src/api/client.ts`, `packages/client/src/pages/HomePage.tsx`, `packages/client/src/pages/PreJoinPage.tsx`, `packages/client/src/pages/RoomPage.tsx`

- [ ] **Step 1: Create global styles**

```css
/* packages/client/src/styles/globals.css */
:root {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --text-primary: #e5e5e5;
  --text-secondary: #a0a0a0;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #ef4444;
  --success: #22c55e;
  --border: #333;
  --radius: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

button {
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

button.primary {
  background: var(--accent);
  color: white;
}

button.primary:hover {
  background: var(--accent-hover);
}

button.danger {
  background: var(--danger);
  color: white;
}

input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

input:focus {
  border-color: var(--accent);
}
```

- [ ] **Step 2: Create API client**

```typescript
// packages/client/src/api/client.ts
const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function createRoom() {
  return request<{ id: string; hostKey: string }>("/rooms", { method: "POST" });
}

export function getRoom(id: string) {
  return request<{ id: string; status: string; participantCount: number }>(`/rooms/${id}`);
}

export function getToken(roomId: string, participantName: string, hostKey?: string) {
  return request<{ token: string; isHost: boolean; iceServers: any[] }>(
    `/rooms/${roomId}/token`,
    {
      method: "POST",
      body: JSON.stringify({ participantName, hostKey }),
    }
  );
}

export function uploadArtifact(roomId: string, type: string, filename: string, content: string, contentType: string) {
  return request<{ key: string; url: string }>(`/rooms/${roomId}/artifacts`, {
    method: "POST",
    body: JSON.stringify({ type, filename, content, contentType }),
  });
}
```

- [ ] **Step 3: Create main.tsx and App.tsx with routing**

```tsx
// packages/client/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// packages/client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PreJoinPage } from "./pages/PreJoinPage";
import { RoomPage } from "./pages/RoomPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<PreJoinPage />} />
        <Route path="/room/:roomId/session" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Create HomePage**

```tsx
// packages/client/src/pages/HomePage.tsx
import { useNavigate } from "react-router-dom";
import { createRoom } from "../api/client";
import { useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const { id, hostKey } = await createRoom();
      navigate(`/room/${id}?host_key=${hostKey}`);
    } catch (err) {
      alert("Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 24 }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>W3-Meet</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 18 }}>Secure video conferencing</p>
      <button className="primary" onClick={handleCreate} disabled={loading} style={{ fontSize: 18, padding: "14px 40px" }}>
        {loading ? "Creating..." : "Create Room"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create PreJoinPage**

```tsx
// packages/client/src/pages/PreJoinPage.tsx
import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

export function PreJoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const hostKey = searchParams.get("host_key") || undefined;

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const params = new URLSearchParams({ name: name.trim() });
    if (hostKey) params.set("host_key", hostKey);
    navigate(`/room/${roomId}/session?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 24 }}>
      <h2>Join Room</h2>
      <p style={{ color: "var(--text-secondary)" }}>Room: {roomId}</p>
      <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 16, width: 300 }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Join
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Create RoomPage placeholder**

```tsx
// packages/client/src/pages/RoomPage.tsx
import { useParams, useSearchParams } from "react-router-dom";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") || "Anonymous";
  const hostKey = searchParams.get("host_key") || undefined;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p>Room: {roomId} | Name: {name} | Host: {hostKey ? "Yes" : "No"}</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify frontend builds**

```bash
cd D:/Projects/W3-Meet && pnpm --filter @w3-meet/client build
```

- [ ] **Step 8: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add SPA shell with routing, landing page, pre-join page"
```

---

## Task 10: Frontend — LiveKit Video Room

**Files:**
- Create: `packages/client/src/hooks/useRoom.ts`
- Create: `packages/client/src/components/room/VideoGrid.tsx`, `packages/client/src/components/room/ControlBar.tsx`, `packages/client/src/components/room/ParticipantList.tsx`, `packages/client/src/components/room/RecordingIndicator.tsx`
- Modify: `packages/client/src/pages/RoomPage.tsx`

- [ ] **Step 1: Create useRoom hook**

```typescript
// packages/client/src/hooks/useRoom.ts
import { useState, useEffect } from "react";
import { getToken } from "../api/client";

interface RoomConnection {
  token: string;
  isHost: boolean;
  iceServers: any[];
  serverUrl: string;
}

export function useRoom(roomId: string, name: string, hostKey?: string) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function connect() {
      try {
        const res = await getToken(roomId, name, hostKey);
        setConnection({
          token: res.token,
          isHost: res.isHost,
          iceServers: res.iceServers,
          serverUrl: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/rtc`,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    connect();
  }, [roomId, name, hostKey]);

  return { connection, error, loading };
}
```

- [ ] **Step 2: Create VideoGrid component**

```tsx
// packages/client/src/components/room/VideoGrid.tsx
import {
  GridLayout,
  ParticipantTile,
  useTracks,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  );

  if (screenShareTrack) {
    return (
      <FocusLayoutContainer style={{ height: "100%" }}>
        <FocusLayout trackRef={screenShareTrack} />
        <CarouselLayout tracks={tracks.filter((t) => t.source !== Track.Source.ScreenShare)}>
          <ParticipantTile />
        </CarouselLayout>
      </FocusLayoutContainer>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}
```

- [ ] **Step 3: Create ControlBar component**

```tsx
// packages/client/src/components/room/ControlBar.tsx
import { useState } from "react";
import {
  useLocalParticipant,
  TrackToggle,
  DisconnectButton,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface ControlBarProps {
  isHost: boolean;
  activePanel: string | null;
  onPanelToggle: (panel: string) => void;
}

export function ControlBar({ isHost, activePanel, onPanelToggle }: ControlBarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "12px 16px",
      background: "var(--bg-secondary)",
      borderTop: "1px solid var(--border)",
    }}>
      <TrackToggle source={Track.Source.Microphone} />
      <TrackToggle source={Track.Source.Camera} />
      <TrackToggle source={Track.Source.ScreenShare} />

      <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 8px" }} />

      <button
        className={activePanel === "whiteboard" ? "primary" : ""}
        onClick={() => onPanelToggle("whiteboard")}
        style={{ background: activePanel === "whiteboard" ? "var(--accent)" : "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        Whiteboard
      </button>
      <button
        onClick={() => onPanelToggle("docs")}
        style={{ background: activePanel === "docs" ? "var(--accent)" : "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        Docs
      </button>
      <button
        onClick={() => onPanelToggle("code")}
        style={{ background: activePanel === "code" ? "var(--accent)" : "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        Code
      </button>

      <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 8px" }} />

      <DisconnectButton>Leave</DisconnectButton>
    </div>
  );
}
```

- [ ] **Step 4: Create ParticipantList**

```tsx
// packages/client/src/components/room/ParticipantList.tsx
import { useParticipants } from "@livekit/components-react";

export function ParticipantList() {
  const participants = useParticipants();

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-secondary)" }}>
        Participants ({participants.length})
      </h3>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {participants.map((p) => {
          const meta = p.metadata ? JSON.parse(p.metadata) : {};
          return (
            <li key={p.identity} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: p.isSpeaking ? "var(--success)" : "var(--text-secondary)",
              }} />
              <span>{p.identity}</span>
              {meta.isHost && <span style={{ fontSize: 11, color: "var(--accent)" }}>HOST</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Create RecordingIndicator**

```tsx
// packages/client/src/components/room/RecordingIndicator.tsx
export function RecordingIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(239,68,68,0.9)",
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      zIndex: 10,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animation: "pulse 1s infinite" }} />
      REC
    </div>
  );
}
```

- [ ] **Step 6: Update RoomPage to wire LiveKit**

```tsx
// packages/client/src/pages/RoomPage.tsx
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { VideoGrid } from "../components/room/VideoGrid";
import { ControlBar } from "../components/room/ControlBar";
import { ParticipantList } from "../components/room/ParticipantList";
import { RecordingIndicator } from "../components/room/RecordingIndicator";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get("name") || "Anonymous";
  const hostKey = searchParams.get("host_key") || undefined;
  const { connection, error, loading } = useRoom(roomId!, name, hostKey);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Connecting...</div>;
  if (error || !connection) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--danger)" }}>Error: {error}</div>;

  function handlePanelToggle(panel: string) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <LiveKitRoom
      serverUrl={connection.serverUrl}
      token={connection.token}
      connect={true}
      onDisconnected={() => navigate("/")}
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left sidebar */}
        <div style={{ width: 240, borderRight: "1px solid var(--border)", background: "var(--bg-secondary)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <ParticipantList />
          {/* ChatPanel will go here */}
        </div>

        {/* Center: video grid */}
        <div style={{ flex: 1, position: "relative" }}>
          <RecordingIndicator active={false} />
          <VideoGrid />
        </div>

        {/* Right panel: tools */}
        {activePanel && (
          <div style={{ width: "45%", borderLeft: "1px solid var(--border)", background: "var(--bg-secondary)", overflow: "hidden" }}>
            {activePanel === "whiteboard" && <div style={{ padding: 16 }}>Whiteboard placeholder</div>}
            {activePanel === "docs" && <div style={{ padding: 16 }}>Docs placeholder</div>}
            {activePanel === "code" && <div style={{ padding: 16 }}>Code placeholder</div>}
          </div>
        )}
      </div>

      <ControlBar isHost={connection.isHost} activePanel={activePanel} onPanelToggle={handlePanelToggle} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
pnpm --filter @w3-meet/client build
```

- [ ] **Step 8: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add LiveKit video room with grid layout, control bar, participants"
```

---

## Task 11: Frontend — Chat Panel

**Files:**
- Create: `packages/client/src/hooks/useChat.ts`, `packages/client/src/components/room/ChatPanel.tsx`
- Modify: `packages/client/src/pages/RoomPage.tsx`

- [ ] **Step 1: Create useChat hook**

```typescript
// packages/client/src/hooks/useChat.ts
import { useState, useCallback } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@w3-meet/shared";

const CHAT_TOPIC = "chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { localParticipant } = useLocalParticipant();

  const onMessage = useCallback((payload: Uint8Array) => {
    const msg: ChatMessage = JSON.parse(new TextDecoder().decode(payload));
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { send } = useDataChannel(CHAT_TOPIC, onMessage);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = {
        id: nanoid(8),
        sender: localParticipant.identity || "Anonymous",
        text: text.trim(),
        timestamp: Date.now(),
      };
      const payload = new TextEncoder().encode(JSON.stringify(msg));
      send(payload, { reliable: true });
      setMessages((prev) => [...prev, msg]);
    },
    [send, localParticipant.identity]
  );

  return { messages, sendMessage };
}
```

- [ ] **Step 2: Create ChatPanel**

```tsx
// packages/client/src/components/room/ChatPanel.tsx
import { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";

export function ChatPanel() {
  const { messages, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
    setInput("");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderTop: "1px solid var(--border)" }}>
      <h3 style={{ fontSize: 14, padding: "12px 16px", color: "var(--text-secondary)" }}>Chat</h3>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{msg.sender}: </span>
            <span style={{ fontSize: 13 }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: 12, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
        />
        <button type="submit" className="primary" style={{ padding: "8px 16px", fontSize: 13 }}>
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Wire ChatPanel into RoomPage sidebar**

In `RoomPage.tsx`, replace `{/* ChatPanel will go here */}` with `<ChatPanel />` and add the import.

- [ ] **Step 4: Create useRecording hook**

```typescript
// packages/client/src/hooks/useRecording.ts
import { useState, useEffect, useCallback } from "react";

export function useRecording(roomId: string, isHost: boolean) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll recording status every 5s
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/recordings/status`);
        const data = await res.json();
        setRecording(data.recording);
      } catch {}
    }
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const toggleRecording = useCallback(async () => {
    if (!isHost) return;
    setLoading(true);
    try {
      const endpoint = recording ? "stop" : "start";
      await fetch(`/api/rooms/${roomId}/recordings/${endpoint}`, { method: "POST" });
      setRecording(!recording);
    } catch (err) {
      console.error("Recording toggle failed:", err);
    } finally {
      setLoading(false);
    }
  }, [roomId, recording, isHost]);

  return { recording, toggleRecording, loading };
}
```

- [ ] **Step 5: Wire useRecording into RoomPage and ControlBar**

In `RoomPage.tsx`, add `useRecording` hook and pass `recording` to `RecordingIndicator` and `ControlBar`. In `ControlBar`, add a Record button visible only to host:

```tsx
{isHost && (
  <button
    onClick={onRecordToggle}
    disabled={recordingLoading}
    style={{ background: recording ? "var(--danger)" : "var(--bg-tertiary)", color: "var(--text-primary)" }}
  >
    {recording ? "Stop Rec" : "Record"}
  </button>
)}
```

- [ ] **Step 6: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add real-time chat and recording controls"
```

---

## Task 12: Frontend — Whiteboard (Excalidraw + Yjs)

**Files:**
- Create: `packages/client/src/hooks/useYjsProvider.ts`, `packages/client/src/components/whiteboard/WhiteboardPanel.tsx`

- [ ] **Step 1: Create useYjsProvider hook**

```typescript
// packages/client/src/hooks/useYjsProvider.ts
import { useEffect, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function useYjsProvider(docName: string, username: string) {
  const ydoc = useMemo(() => new Y.Doc(), [docName]);

  const provider = useMemo(() => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/yjs`;
    return new WebsocketProvider(wsUrl, docName, ydoc);
  }, [docName, ydoc]);

  useEffect(() => {
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [provider, ydoc, username]);

  return { ydoc, provider, awareness: provider.awareness };
}
```

- [ ] **Step 2: Create WhiteboardPanel**

```tsx
// packages/client/src/components/whiteboard/WhiteboardPanel.tsx
import { useEffect, useRef, useState } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useYjsProvider } from "../../hooks/useYjsProvider";
import { uploadArtifact } from "../../api/client";

interface WhiteboardPanelProps {
  roomId: string;
  username: string;
}

export function WhiteboardPanel({ roomId, username }: WhiteboardPanelProps) {
  const { ydoc, provider } = useYjsProvider(`wb:${roomId}`, username);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const isRemoteUpdate = useRef(false);
  const yElementsMap = ydoc.getMap<any>("elements-map");

  // Sync Yjs → Excalidraw
  useEffect(() => {
    const observer = () => {
      if (isRemoteUpdate.current) return;
      if (api) {
        isRemoteUpdate.current = true;
        const elements = Array.from(yElementsMap.values());
        api.updateScene({ elements });
        isRemoteUpdate.current = false;
      }
    };
    yElementsMap.observe(observer);
    return () => yElementsMap.unobserve(observer);
  }, [api, yElementsMap]);

  // Sync Excalidraw → Yjs (element-level diffing via Y.Map keyed by element ID)
  const yElementsMap = ydoc.getMap<any>("elements-map");

  function handleChange(elements: readonly any[]) {
    if (isRemoteUpdate.current) return;
    isRemoteUpdate.current = true;
    ydoc.transact(() => {
      const currentIds = new Set(elements.map((e) => e.id));
      // Remove deleted elements
      for (const key of yElementsMap.keys()) {
        if (!currentIds.has(key)) yElementsMap.delete(key);
      }
      // Upsert changed elements
      for (const el of elements) {
        const existing = yElementsMap.get(el.id);
        if (!existing || existing.version !== el.version) {
          yElementsMap.set(el.id, { ...el });
        }
      }
    });
    isRemoteUpdate.current = false;
  }

  async function handleSave() {
    if (!api) return;
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      files: api.getFiles(),
      mimeType: "image/png",
    });
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    await uploadArtifact(roomId, "whiteboard", "whiteboard.png", base64, "image/png");
    alert("Whiteboard saved!");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Whiteboard</span>
        <button onClick={handleSave} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 12, padding: "6px 12px" }}>
          Save PNG
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Excalidraw
          excalidrawAPI={(api) => setApi(api)}
          onChange={handleChange}
          theme="dark"
          UIOptions={{ canvasActions: { saveAsImage: false, loadScene: false } }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire WhiteboardPanel into RoomPage**

In `RoomPage.tsx`, replace whiteboard placeholder:
```tsx
{activePanel === "whiteboard" && <WhiteboardPanel roomId={roomId!} username={name} />}
```

- [ ] **Step 4: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add collaborative whiteboard with Excalidraw + Yjs sync"
```

---

## Task 13: Frontend — Collaborative Documents (TipTap + Yjs)

**Files:**
- Create: `packages/client/src/components/docs/DocsPanel.tsx`

- [ ] **Step 1: Create DocsPanel**

```tsx
// packages/client/src/components/docs/DocsPanel.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useYjsProvider } from "../../hooks/useYjsProvider";
import { uploadArtifact } from "../../api/client";

const lowlight = createLowlight(common);

interface DocsPanelProps {
  roomId: string;
  username: string;
}

export function DocsPanel({ roomId, username }: DocsPanelProps) {
  const { ydoc, provider } = useYjsProvider(`doc:${roomId}`, username);

  const userColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: username, color: userColor },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      CodeBlockLowlight.configure({ lowlight }),
    ],
  });

  async function handleSave() {
    if (!editor) return;
    const markdown = editor.storage.markdown?.getMarkdown?.() || editor.getHTML();
    const base64 = btoa(unescape(encodeURIComponent(markdown)));
    await uploadArtifact(roomId, "document", "document.md", base64, "text/markdown");
    alert("Document saved!");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Document</span>
        <button onClick={handleSave} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 12, padding: "6px 12px" }}>
          Save
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <EditorContent
          editor={editor}
          style={{ minHeight: "100%", outline: "none" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire DocsPanel into RoomPage**

In `RoomPage.tsx`, replace docs placeholder:
```tsx
{activePanel === "docs" && <DocsPanel roomId={roomId!} username={name} />}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add collaborative document editor with TipTap + Yjs"
```

---

## Task 14: Frontend — Rustpad Code Panel (iframe)

**Files:**
- Create: `packages/client/src/components/code/CodePanel.tsx`

- [ ] **Step 1: Create CodePanel**

```tsx
// packages/client/src/components/code/CodePanel.tsx
interface CodePanelProps {
  roomId: string;
}

export function CodePanel({ roomId }: CodePanelProps) {
  const padUrl = `/pad/${roomId}`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Code</span>
        <a
          href={padUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={padUrl}
        style={{ flex: 1, border: "none", background: "#1e1e1e" }}
        title="Rustpad Code Editor"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire CodePanel into RoomPage**

In `RoomPage.tsx`, replace code placeholder:
```tsx
{activePanel === "code" && <CodePanel roomId={roomId!} />}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/
git commit -m "feat(client): add Rustpad code editor iframe integration"
```

---

## Task 15: Docker Compose Relay (coturn)

**Files:**
- Create: `docker/coturn.conf`, `docker/docker-compose.relay.yml`

- [ ] **Step 1: Create coturn config**

```conf
# docker/coturn.conf
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=turnsecret
realm=w3-meet
total-quota=100
stale-nonce=600
no-multicast-peers
```

- [ ] **Step 2: Create relay docker-compose**

```yaml
# docker/docker-compose.relay.yml
services:
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49152-49200:49152-49200/udp"
    volumes:
      - ./coturn.conf:/etc/turnserver.conf
    command: ["-c", "/etc/turnserver.conf"]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.relay.conf:/etc/nginx/conf.d/default.conf
      # Mount TLS certs here for production
    depends_on:
      - coturn
    restart: unless-stopped
```

- [ ] **Step 3: Create relay nginx config**

```nginx
# docker/nginx.relay.conf
server {
    listen 443 ssl;

    # TLS certs (mount in production)
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        return 200 '{"status":"relay"}';
        add_header Content-Type application/json;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add docker/coturn.conf docker/docker-compose.relay.yml docker/nginx.relay.conf
git commit -m "infra: add coturn TURN relay Docker Compose config"
```

---

## Task 16: Integration Test — Full Stack Smoke Test

**Files:**
- Create: `packages/server/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration smoke test**

```typescript
// packages/server/src/__tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
    // Create
    const createRes = await request(app).post("/api/rooms");
    expect(createRes.status).toBe(201);
    const { id, hostKey } = createRes.body;

    // Get (public, no hostKey)
    const getRes = await request(app).get(`/api/rooms/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
    expect(getRes.body.hostKey).toBeUndefined();

    // Verify host key
    const isValid = await roomService.validateHostKey(id, hostKey);
    expect(isValid).toBe(true);
  });

  it("returns 404 for non-existent room", async () => {
    const res = await request(app).get("/api/rooms/nonexistent");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
cd D:/Projects/W3-Meet && pnpm --filter @w3-meet/server test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/__tests__/integration.test.ts
git commit -m "test: add integration smoke test for room lifecycle"
```

---

## Task 17: Final Wiring and README

**Files:**
- Modify: `packages/client/src/pages/RoomPage.tsx` — final imports cleanup
- Create: `README.md`

- [ ] **Step 1: Ensure all imports in RoomPage are correct**

Verify `RoomPage.tsx` imports `WhiteboardPanel`, `DocsPanel`, `CodePanel`, `ChatPanel` and uses them in the corresponding panel sections.

- [ ] **Step 2: Create README.md**

```markdown
# W3-Meet

Self-hosted video conferencing platform with collaborative tools.

## Features

- Video/audio calls (LiveKit WebRTC)
- Screen sharing
- Cloud recording (LiveKit Egress → MinIO)
- Collaborative whiteboard (Excalidraw + Yjs)
- Collaborative documents (TipTap + Yjs)
- Collaborative code editor (Rustpad)
- Text chat (LiveKit Data Messages)
- TURN relay for connectivity with RU/BY

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Development

```bash
# Start infrastructure
cd docker && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Install dependencies
pnpm install

# Start dev servers
pnpm dev
```

Open http://localhost:5173

### Production

See `docs/superpowers/specs/2026-03-23-w3-meet-design.md` for deployment guide.

## Architecture

See `docs/superpowers/specs/2026-03-23-w3-meet-design.md`
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: add README with quick start guide"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Monorepo scaffolding | None |
| 2 | Docker infrastructure | None |
| 3 | Backend: config, redis, rate limiting | Task 1 |
| 4 | Backend: room service | Task 3 |
| 5 | Backend: LiveKit + TURN services | Task 3 |
| 6 | Backend: storage service (MinIO) | Task 3 |
| 7 | Backend: API routes + Express app | Tasks 4, 5, 6 |
| 8 | Backend: Yjs WebSocket server | Task 3 |
| 9 | Frontend: shell, routing, landing | Task 1 |
| 10 | Frontend: LiveKit video room | Tasks 7, 9 |
| 11 | Frontend: chat panel + recording controls | Task 10 |
| 12 | Frontend: whiteboard (Excalidraw + Yjs) | Tasks 8, 10 |
| 13 | Frontend: collaborative docs (TipTap) | Tasks 8, 10 |
| 14 | Frontend: Rustpad code panel | Tasks 2, 10 |
| 15 | Docker relay (coturn) | None |
| 16 | Integration smoke test | Task 7 |
| 17 | Final wiring + README | All |

**Parallelizable groups:**
- Group A (independent): Tasks 1, 2, 15
- Group B (backend, after Task 1): Tasks 3 → 4, 5, 6 (parallel) → 7, 8
- Group C (frontend, after Tasks 1, 7): Tasks 9 → 10 → 11, 12, 13, 14 (parallel)
- Final: Tasks 16, 17

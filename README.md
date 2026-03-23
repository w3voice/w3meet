# W3-Meet

Self-hosted video conferencing platform with collaborative tools, optimized for connectivity with sanctioned regions.

## Features

- Video/audio calls (LiveKit WebRTC)
- Screen sharing
- Cloud recording (LiveKit Egress → MinIO)
- Collaborative whiteboard (Excalidraw + Yjs)
- Collaborative documents (TipTap + Yjs)
- Collaborative code editor (Rustpad)
- Text chat (LiveKit Data Messages)
- TURN relay for RU/BY connectivity (coturn)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (running)

### 1. Clone and install

```bash
git clone https://github.com/w3voice/w3meet.git
cd w3meet
pnpm install
```

### 2. Create .env file

Copy the example and use as-is for local development — all defaults match Docker Compose:

```bash
cp .env.example .env
```

The `.env` file is pre-configured for local Docker setup. You only need to change values for production deployment.

### 3. Start Docker services

```bash
cd docker && docker compose -f docker-compose.yml up -d && cd ..
```

This starts:
| Service | Port | Purpose |
|---------|------|---------|
| LiveKit | 7880 | WebRTC SFU server |
| Redis | 6379 | Room state, Yjs snapshots |
| MinIO | 9000 (API), 9001 (console) | Recording & artifact storage |
| Rustpad | 3030 | Collaborative code editor |
| Egress | — | Recording service (connects to LiveKit) |

### 4. Start dev servers

```bash
pnpm dev
```

This starts both backend (port 3001) and frontend (port 5173).

Open **http://localhost:5173**

### 5. Use

1. Click **"Create Room"** on the landing page
2. Enter your name and click **"Connect"**
3. Share the room link with others (without the `host_key` parameter)
4. Use the bottom toolbar to toggle: camera, mic, screen share, whiteboard, docs, code

## Environment Variables

All variables are in `.env` at the project root. For local development, the defaults from `.env.example` work out of the box.

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEKIT_API_KEY` | `devkey` | LiveKit API key (must match `docker/livekit.yaml`) |
| `LIVEKIT_API_SECRET` | `devsecret` | LiveKit API secret (must match `docker/livekit.yaml`) |
| `LIVEKIT_URL` | `ws://localhost:7880` | LiveKit server WebSocket URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `MINIO_ENDPOINT` | `localhost` | MinIO hostname |
| `MINIO_PORT` | `9000` | MinIO API port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key (must match docker-compose) |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key (must match docker-compose) |
| `MINIO_BUCKET_RECORDINGS` | `recordings` | Bucket for call recordings |
| `MINIO_BUCKET_ARTIFACTS` | `artifacts` | Bucket for whiteboard/doc/code exports |
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (frontend URL) |
| `TURN_SECRET` | `turnsecret` | TURN server shared secret (must match `docker/coturn.conf`) |
| `TURN_SERVER` | `turn:localhost:3478` | TURN server address |
| `TURN_TLS_SERVER` | `turns:localhost:5349` | TURN server TLS address |

**For production:** change all secrets (`LIVEKIT_API_SECRET`, `MINIO_SECRET_KEY`, `TURN_SECRET`) to strong random values and update the corresponding Docker configs.

## Run Tests

```bash
pnpm test
```

## Architecture

```
Client (Vite + React)  ←→  Backend (Express + Node.js)  ←→  LiveKit Server (SFU)
                       ←→  Yjs WebSocket Server          ←→  Redis
                       ←→  Rustpad (iframe)               ←→  MinIO (recordings)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| Video/Audio | LiveKit Server + @livekit/components-react |
| Backend | Node.js + Express |
| Whiteboard | Excalidraw + Yjs |
| Documents | TipTap + Yjs |
| Code Editor | Rustpad |
| Recording | LiveKit Egress → MinIO |
| State | Redis |
| TURN Relay | coturn |

## Production Deployment

### Primary Server (Hetzner EU)

1. Set up a VPS (recommended: 4 vCPU, 8 GB RAM, 100 GB SSD)
2. Install Docker & Docker Compose
3. Clone the repo, create `.env` with production secrets
4. Update `docker/livekit.yaml` — change `keys` to match your `.env`
5. Add TLS certificates (Let's Encrypt via Certbot)
6. Run:

```bash
cd docker && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Relay Server (Kazakhstan/Turkey)

For improved connectivity with RU/BY:

1. Set up a VPS in KZ or TR (recommended: 2 vCPU, 4 GB RAM)
2. Update `docker/coturn.conf` — change `static-auth-secret` to match `TURN_SECRET`
3. Add TLS certificates
4. Run:

```bash
cd docker && docker compose -f docker-compose.relay.yml up -d
```

5. Update primary server's `TURN_SERVER` and `TURN_TLS_SERVER` to point to the relay IP

## Design

Full spec: `docs/superpowers/specs/2026-03-23-w3-meet-design.md`

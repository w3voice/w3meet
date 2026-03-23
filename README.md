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
- Docker & Docker Compose

### Development

```bash
# Start infrastructure (LiveKit, Redis, MinIO, Rustpad, Egress)
cd docker && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Install dependencies
pnpm install

# Start dev servers (backend + frontend)
pnpm dev
```

Open http://localhost:5173

### Run Tests

```bash
pnpm test
```

## Architecture

```
Client (Vite + React)  ←→  Backend (Express + Node.js)  ←→  LiveKit Server (SFU)
                       ←→  Yjs WebSocket Server          ←→  Redis
                       ←→  Rustpad (iframe)               ←→  MinIO (recordings)
```

See `docs/superpowers/specs/2026-03-23-w3-meet-design.md` for full architecture details.

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

## Deployment

### Primary Server (Hetzner EU)

```bash
cd docker && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Relay Server (Kazakhstan/Turkey)

```bash
cd docker && docker compose -f docker-compose.relay.yml up -d
```

Configure TLS certificates and update `coturn.conf` with production secrets before deploying.

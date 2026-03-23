# W3-Meet — Design Specification

**Date:** 2026-03-23
**Status:** Approved
**Approach:** LiveKit-based modular architecture

## Overview

W3-Meet is a self-hosted video conferencing platform designed for reliable communication with contacts in sanctioned regions (Russia, Belarus). It combines real-time video/audio, screen sharing, cloud recording, collaborative whiteboard, document editing, and collaborative code editing into a single application.

## Key Decisions

- **No registration** — access via invite links only, users enter a display name
- **No database** — rooms are ephemeral, state in Redis, recordings in MinIO
- **Max 20-30 participants** per room (SFU architecture)
- **TLS/DTLS transport encryption** + at-rest encryption for recordings
- **Relay node in Kazakhstan/Turkey** for RU/BY connectivity via coturn TURN server

## Room Creation & Lifecycle

### Room Creation
- Landing page at `/` with a "Create Room" button
- Backend generates a short unique room ID (nanoid, 10 chars, e.g. `xK9f2mQ7pL`)
- Redirects creator to `/room/{room-id}?host_key={secret}`
- `host_key` is a separate secret (nanoid, 20 chars) stored in Redis alongside room metadata
- Creator shares the link `/room/{room-id}` with participants (without host_key)
- Auto-creation on visit is **disabled** — only the `/api/rooms` endpoint creates rooms
- Rate limiting: max 10 rooms per IP per hour

### Room Lifecycle
1. **Created** — room entry exists in Redis, no participants yet
2. **Active** — at least one participant connected
3. **Idle** — all participants left; 15-minute grace period starts
4. **Terminated** — grace period expired; Redis keys deleted, Yjs docs purged from memory
- During grace period, reconnecting participants restore the room to Active
- Yjs state is periodically snapshotted to Redis (every 30s) for crash recovery
- On Yjs server restart, state is restored from the latest Redis snapshot
- Rustpad documents are ephemeral — no crash recovery (acceptable for code scratch pads)

### Host Authentication
- Room creator receives `host_key` in the URL — this is the host secret
- Anyone with `host_key` can claim host privileges (mute/kick/start recording)
- Host key is validated server-side when generating the LiveKit JWT (adds `canPublishData: true` + room admin metadata)
- If host disconnects and rejoins with `host_key`, they reclaim host status
- If host leaves without transferring: no auto-promotion, room continues without a host
- Host can manually transfer host role to another participant via UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Video/Audio/Screen Share | LiveKit Server + @livekit/components-react |
| Backend API | Node.js + Express |
| Whiteboard | Excalidraw + Yjs (y-websocket) |
| Documents | TipTap + Yjs collaboration extensions |
| Code Editor | Rustpad (separate container, iframe embed) |
| Sync Engine | Yjs CRDT via y-websocket server |
| Recording | LiveKit Egress API → MinIO |
| Object Storage | MinIO (S3-compatible, self-hosted) |
| State | Redis |
| Reverse Proxy | Nginx + Let's Encrypt |
| TURN/STUN Relay | coturn |
| Containerization | Docker Compose |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (SPA)                      │
│  Vite + React + TypeScript                          │
│  ┌──────────┬──────────┬──────────┬───────────────┐ │
│  │ VideoRoom│Whiteboard│  Docs    │   Code (Rust- │ │
│  │ (LiveKit │(Excali-  │(TipTap + │   pad iframe) │ │
│  │Components│ draw)    │  Yjs)    │               │ │
│  └──────────┴──────────┴──────────┴───────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │ WebSocket / WebRTC
┌─────────────────────▼───────────────────────────────┐
│                 Backend (Node.js)                     │
│  ┌─────────────┬──────────────┬───────────────────┐ │
│  │ Room API    │ Yjs WebSocket│ Auth (JWT tokens  │ │
│  │ (create     │ Provider     │ for rooms,        │ │
│  │  rooms,     │ (sync docs   │ no registration)  │ │
│  │  tokens)    │ + whiteboard)│                   │ │
│  └─────────────┴──────────────┴───────────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Infrastructure                          │
│  ┌───────────┬──────────┬──────────┬──────────────┐ │
│  │ LiveKit   │ Rustpad  │  MinIO   │ Redis        │ │
│  │ Server    │ Server   │(records) │ (room state) │ │
│  │ (SFU)     │ (Rust)   │          │              │ │
│  └───────────┴──────────┴──────────┴──────────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │ TURN/STUN relay (Kazakhstan/Turkey) for RU/BY   ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
W3-Meet/
├── packages/
│   ├── client/          # Vite + React SPA
│   ├── server/          # Node.js backend
│   └── shared/          # Shared types, constants
├── docker/
│   ├── docker-compose.yml        # Primary server
│   ├── docker-compose.relay.yml  # Relay server
│   ├── livekit.yaml              # LiveKit config
│   ├── nginx.conf                # Nginx config
│   └── coturn.conf               # TURN config
├── docs/
└── package.json         # pnpm workspaces root
```

## Module 1: Video/Audio + Screen Sharing

### LiveKit Integration
- `livekit-server` as SFU — manages rooms, media routing
- `@livekit/components-react` for UI — video tiles, control bar, screen share
- `livekit-server-sdk` (Node.js) for token generation and room management

### Room Join Flow
1. User opens `/room/{room-id}`
2. Enters display name (no registration)
3. Backend generates JWT token via LiveKit Server SDK
4. Client connects to LiveKit Server directly via WebRTC
5. First user becomes host (can mute/kick)

### Screen Sharing
- Built into LiveKit — `useLocalParticipant().screenShareTrack`
- Automatic layout switching between grid and speaker view

### Layout
- Left sidebar: participant list, chat
- Center: video tiles (grid) or screen share (speaker view)
- Bottom bar: mic, camera, screen share, record, whiteboard, docs, code
- Tabs for switching between whiteboard / docs / code — open as right panel or fullscreen

## Module 2: Cloud Recording

### LiveKit Egress API
- Host triggers recording via "Record" button
- Backend calls `egressClient.startRoomCompositeEgress()`
- LiveKit Egress renders room in headless Chrome, outputs MP4
- File streams directly to MinIO

### Storage
- MinIO bucket: `recordings/{room-id}/{timestamp}.mp4`
- Pre-signed URLs for download (TTL: 7 days, configurable)
- Optional: lifecycle policy for auto-cleanup

### UX
- Red "REC" indicator visible to all participants
- Notification on join if recording is active

## Module 3: Whiteboard

### Excalidraw + Yjs
- `@excalidraw/excalidraw` — React component, embedded directly (not iframe)
- Yjs CRDT for conflict-free sync between participants
- `y-excalidraw` or custom binding connecting Excalidraw state to Yjs doc
- Transport: `y-websocket` provider → Yjs WebSocket server on backend

### Yjs Document
- Document ID: `wb:{room-id}`
- Awareness protocol: shows other participants' cursors with names

### Persistence
- State lives in Yjs server memory while room is active
- Yjs state snapshotted to Redis every 30s (crash recovery — see Room Lifecycle)
- Export to PNG/SVG via Excalidraw API (button "Save whiteboard")
- Saved to MinIO: `artifacts/{room-id}/whiteboard-{timestamp}.png`

## Module 4: Collaborative Documents

### TipTap + Yjs
- `@tiptap/react` — rich-text editor based on ProseMirror
- `@tiptap/extension-collaboration` — built-in Yjs binding
- `@tiptap/extension-collaboration-cursor` — participant cursors with names/colors

### Features
- Formatting: headings, bold/italic, lists, checkboxes, tables
- Code blocks with syntax highlighting (`@tiptap/extension-code-block-lowlight`)
- Image insertion (drag & drop → upload to MinIO → insert link)
- Markdown shortcuts (# → heading, - → list, etc.)

### Yjs Document
- Document ID: `doc:{room-id}`
- Same Yjs WebSocket server as whiteboard

### Export
- Button "Save" → export to Markdown or HTML
- Saved to MinIO: `artifacts/{room-id}/doc-{timestamp}.md`

## Module 5: Collaborative Code (Rustpad)

### Separate Service
- Rustpad — open-source collaborative code editor (Rust)
- Own synchronization engine (operational transform), independent of Yjs
- Built-in Monaco Editor (same as VS Code)
- Syntax highlighting for 30+ languages

### Integration
- Runs as separate Docker container
- Embedded via iframe: `<iframe src="/pad/{room-id}" />`
- Nginx proxies `/pad/*` to Rustpad container

### Features
- Language selection (JS, Python, Go, Rust, SQL, etc.)
- Multiple cursors with names
- Basic autocomplete (Monaco built-in)

### Persistence
- Rustpad stores documents in memory
- "Save code" button → POST to backend → MinIO: `artifacts/{room-id}/code-{timestamp}.{ext}`

## Module 6: Infrastructure & Connectivity

### Server Topology

**Primary Server (Hetzner Helsinki/Falkenstein):**
- LiveKit Server, Backend, Yjs WS Server, Rustpad, MinIO, Redis, Nginx, Egress

**Relay Server (Kazakhstan or Turkey):**
- coturn (TURN/STUN relay)
- Nginx (TLS termination)

### RU/BY Connectivity Strategy
- Direct EU ↔ RU/BY routes are often degraded or blocked
- Kazakhstan/Turkey: neutral jurisdictions with good peering to both EU and RU/BY
- coturn TURN server relays WebRTC media traffic through neutral point
- Latency: EU → KZ ≈ 50-70ms, KZ → RU ≈ 20-40ms — total ~100ms, acceptable for video
- TURN over TLS (port 443) — looks like regular HTTPS traffic, hard to block

### TLS & Domains
- Primary domain → Primary server
- Fallback domain → Relay server
- Let's Encrypt certificates via Certbot
- Cloudflare DNS (DNS only, no proxying) for fast failover

### Docker Compose (Primary)
```yaml
services:
  livekit:      # SFU server
  backend:      # Node.js API
  yjs-server:   # Yjs WebSocket
  rustpad:      # Collaborative code
  minio:        # Object storage
  redis:        # State
  nginx:        # Reverse proxy + TLS
  egress:       # LiveKit Egress (recording)
```

### Docker Compose (Relay)
```yaml
services:
  coturn:       # TURN/STUN relay
  nginx:        # TLS termination
```

### Security
- All traffic: TLS/DTLS (WebRTC encrypted by default)
- Recordings encrypted at rest (MinIO server-side encryption)
- JWT tokens with short TTL (4h) for room access, transparent refresh on expiry
- Rate limiting on Nginx (room creation: 10/hour/IP, API: 100/min/IP)
- Recordings contain participant video/audio — operators should assess GDPR obligations if EU residents use the service

### ICE / TURN Configuration
- LiveKit is configured with external ICE servers pointing to the coturn relay
- TURN credentials: time-limited HMAC via TURN REST API (generated by backend, TTL 6h)
- TURN is used as **fallback** — clients first attempt direct STUN connection
- For clients detected in RU/BY (via GeoIP on backend), TURN is **forced** to ensure connectivity
- TURN over TLS on port 443 to avoid firewall issues

### Chat
- Text chat via LiveKit Data Messages (reliable, ordered)
- Messages displayed in left sidebar below participant list
- No persistence — chat lives only during the room session
- Participants see messages from the moment they join (no history)

### Resource Limits
- LiveKit Egress (recording): max 2 concurrent recordings per server
- Recommended primary server specs: 4 vCPU, 8 GB RAM, 100 GB SSD
- Recommended relay server specs: 2 vCPU, 4 GB RAM, 50 GB SSD (bandwidth-bound)

### Browser Compatibility
- Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ (desktop)
- Chrome Mobile, Safari Mobile (iOS 15+) — simplified layout
- Excalidraw on mobile: view-only mode (drawing not reliable on touch)

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

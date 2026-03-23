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

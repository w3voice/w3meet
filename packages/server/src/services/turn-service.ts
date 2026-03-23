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

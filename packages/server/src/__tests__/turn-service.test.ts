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

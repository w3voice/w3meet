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

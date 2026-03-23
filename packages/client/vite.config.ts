import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {},
  },
  server: {
    port: 5173,
    allowedHosts: true,
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

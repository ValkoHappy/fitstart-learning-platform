import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";

const apiTarget = env.VITE_API_TARGET || "http://127.0.0.1:8010";

// https://vite.dev/config/
export default defineConfig({
  base: env.VITE_BASE_PATH || "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/img": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

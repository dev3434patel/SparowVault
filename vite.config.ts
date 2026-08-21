import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:5000";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Phase 1: never ship .js.map to production. Source maps reveal the full
    // TS source tree and any inlined comments / route names. Set
    // VITE_SOURCEMAP=true locally if you need them for debugging a built bundle.
    sourcemap: process.env.VITE_SOURCEMAP === "true" ? true : false,
  },
});

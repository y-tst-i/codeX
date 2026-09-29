import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5180, open: true },
  preview: { port: 5180 },
  build: { chunkSizeWarningLimit: 1500 }
});

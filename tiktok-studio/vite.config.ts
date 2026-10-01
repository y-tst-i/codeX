import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // 作業データはブラウザの「localhost:5180」に保存されるので、番号が勝手に変わらないようにする
  server: { port: 5180, strictPort: true, open: true },
  preview: { port: 5180, strictPort: true },
  build: { chunkSizeWarningLimit: 1500 }
});

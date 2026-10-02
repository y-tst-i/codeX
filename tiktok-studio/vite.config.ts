import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { codexBridge } from "./codexBridge";

// 自分のPCで動く無料の音声合成ソフト（VOICEVOX / AivisSpeech）へ、ブラウザから届くように中継する
const ttsProxy = {
  "/tts/voicevox": { target: "http://127.0.0.1:50021", changeOrigin: true, rewrite: (path: string) => path.replace(/^\/tts\/voicevox/, "") },
  "/tts/aivis": { target: "http://127.0.0.1:10101", changeOrigin: true, rewrite: (path: string) => path.replace(/^\/tts\/aivis/, "") }
};

export default defineConfig({
  // codexBridge：自分のPCの Codex CLI で画像素材を作る（/api/codex/*）
  plugins: [react(), codexBridge()],
  // 作業データはブラウザの「localhost:5180」に保存されるので、番号が勝手に変わらないようにする
  server: { port: 5180, strictPort: true, open: true, proxy: ttsProxy },
  preview: { port: 5180, strictPort: true, proxy: ttsProxy },
  build: { chunkSizeWarningLimit: 1500 }
});

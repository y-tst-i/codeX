import { unwatchFile, watchFile } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { codexBridge } from "./codexBridge";
import { lottieBridge } from "./lottieBridge";

// 自分のPCで動く無料の音声合成ソフト（VOICEVOX / AivisSpeech）へ、ブラウザから届くように中継する
const ttsProxy = {
  "/tts/voicevox": { target: "http://127.0.0.1:50021", changeOrigin: true, rewrite: (path: string) => path.replace(/^\/tts\/voicevox/, "") },
  "/tts/aivis": { target: "http://127.0.0.1:10101", changeOrigin: true, rewrite: (path: string) => path.replace(/^\/tts\/aivis/, "") }
};

/**
 * 起動したまま 更新.bat（npm install）をしても新しいパッケージを見つけられるよう、
 * インストールが終わったら（node_modules/.package-lock.json が書き換わったら）開発サーバーを再起動する。
 * Vite は起動中にパッケージの場所の解決結果を覚えているため、そのままだと「Failed to resolve import」になる。
 */
function restartAfterInstall(): Plugin {
  return {
    name: "tms-restart-after-install",
    apply: "serve",
    configureServer(server) {
      const lock = resolve(server.config.root, "node_modules/.package-lock.json");
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onChange = (current: { mtimeMs: number }, previous: { mtimeMs: number }) => {
        if (current.mtimeMs === previous.mtimeMs) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          server.config.logger.info("パッケージが更新されたので、開発サーバーを再起動します", { timestamp: true });
          void server.restart();
        }, 1500);
      };
      watchFile(lock, { interval: 2000 }, onChange);
      server.httpServer?.once("close", () => {
        clearTimeout(timer);
        unwatchFile(lock, onChange);
      });
    }
  };
}

export default defineConfig({
  // codexBridge：自分のPCの Codex CLI で画像素材を作る（/api/codex/*）
  // lottieBridge：LottieFiles の無料アニメを探して取り込む（/api/lottie/*）
  plugins: [react(), codexBridge(), lottieBridge(), restartAfterInstall()],
  // 作業データはブラウザの「localhost:5180」に保存されるので、番号が勝手に変わらないようにする
  server: { port: 5180, strictPort: true, open: true, proxy: ttsProxy },
  preview: { port: 5180, strictPort: true, proxy: ttsProxy },
  build: { chunkSizeWarningLimit: 1500 }
});

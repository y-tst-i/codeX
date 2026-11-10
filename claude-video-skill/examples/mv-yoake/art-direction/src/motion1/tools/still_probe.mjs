// 静止の下見(書き出す前): 開発ページで look のコマを順に描き、review_checks.py と同じ物差し(約0.1秒=3コマ離れた2コマで、灰色が 6 階調以上変わった画素の割合 %)を出す。
// 使い方: node still_probe.mjs <a> <b> <out.json>
import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), page0 = path.resolve(here, "../../styleframes_v7.html");
const [a, b, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); process.exit(1); });
await page.goto("file://" + page0 + "?f=" + a);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(() => { const c = document.getElementById("c"), ctx = c.getContext("2d", { willReadFrequently: true }); window.__hist = {};
  window.__step = (f) => { A7_DRAW(ctx, { f, look: true }); const d = ctx.getImageData(0, 0, 1920, 1080).data, gy = new Uint8Array(480 * 270); for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) { const i = ((y * 4) * 1920 + x * 4) * 4; gy[y * 480 + x] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; } window.__hist[f] = gy; const p = window.__hist[f - 3]; if (!p) return { f, pct: null }; let n = 0; for (let i = 0; i < gy.length; i++) if (Math.abs(gy[i] - p[i]) >= 6) n++; delete window.__hist[f - 6]; return { f, pct: +(100 * n / gy.length).toFixed(3) }; }; });
const rows = []; for (let f = a; f <= b; f++) rows.push(await page.evaluate((f) => window.__step(f), f));
const still = rows.filter((r) => r.pct !== null && r.pct <= 0.15).map((r) => r.f);
fs.writeFileSync(out, JSON.stringify({ a, b, rows, still }));
const runs = []; let s0 = null, prev = null; for (const f of still) { if (prev !== null && f === prev + 1) { prev = f; continue; } if (s0 !== null) runs.push([s0, prev]); s0 = f; prev = f; } if (s0 !== null) runs.push([s0, prev]);
console.log(JSON.stringify({ a, b, still_frames: still.length, runs: runs.filter(([x, y]) => y - x >= 5) }));
await br.close();

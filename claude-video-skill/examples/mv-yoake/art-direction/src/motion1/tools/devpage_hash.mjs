// 別のプロセス・別のページ(開発ページ styleframes_v7.html)で同じコマを描き、seek_check.mjs と同じ RGB の hash を出す。
// HyperFrames のプロジェクトの seek 検査(seek_X.json)の hash と比べて、ページと載せ方が違っても同じ画素かを確かめる。
// 使い方: node devpage_hash.mjs <seek_X.json> <out.json> <曲のコマ…>
import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), page0 = path.resolve(here, "../../styleframes_v7.html");
const [seekP, out, ...fs_] = process.argv.slice(2); const seek = JSON.parse(fs.readFileSync(seekP, "utf8"));
const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + page0 + "?f=" + fs_[0]); await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const rows = [];
for (const f of fs_.map(Number)) {
  const h = await page.evaluate((f) => { const c = document.getElementById("c"), ctx = c.getContext("2d", { willReadFrequently: true }); A7_DRAW(ctx, { f, look: true }); const d = ctx.getImageData(0, 0, 1920, 1080).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { if ((i & 3) === 3) continue; h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }, f);
  const r = seek.rows.find((x) => x.song === f); rows.push({ f, dev: h, hf: r ? r.hashes[0] : null, same: r ? r.hashes[0] === h : null });
}
const res = { compared: rows.length, diff: rows.filter((r) => r.same === false).length, rows }; fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ compared: res.compared, diff: res.diff }));
await br.close();

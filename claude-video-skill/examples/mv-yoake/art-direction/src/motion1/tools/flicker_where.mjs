// 刀の入れ替わりの場所: コマ f-1 で彫ってあり f で墨に戻った画素の外接箱と数。使い方: node flicker_where.mjs <f…>  (cam=0)
import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), page0 = path.resolve(here, "../../styleframes_v7.html");
const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + page0 + "?f=0&v=mask"); await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
for (const f of process.argv.slice(2).map(Number)) {
  const r = await page.evaluate((f) => { const c = document.getElementById("c"), ctx = c.getContext("2d", { willReadFrequently: true }); const m = (k) => { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1920, 1080); A7_DRAW(ctx, { f: k, look: false, mask: true, cam: 0 }); return ctx.getImageData(0, 0, 1920, 1080).data; }; const a = m(f - 1), b = m(f); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < a.length; i += 4) if (a[i] > 127 && b[i] <= 127) { n++; const p = i / 4, x = p % 1920, y = (p / 1920) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { f, n, box: [x0, y0, x1, y1] }; }, f);
  console.log(JSON.stringify(r));
}
await br.close();

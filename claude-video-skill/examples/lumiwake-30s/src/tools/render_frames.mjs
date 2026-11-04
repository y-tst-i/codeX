// 同じページを開いたまま複数コマを書き出す(焼き込みを1回で済ませる)。
// node render_frames.mjs "<page.html?query>" <outdir> <frames> [prefix]   frames: "0-899" / "22,48,150" / "100-200:5"(5コマおき)
import path from "node:path"; import fs from "node:fs";
const mod = process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(mod);
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const [url, outdir, spec, prefix = "f"] = process.argv.slice(2);
const list = []; for (const part of spec.split(",")) { const m = part.match(/^(\d+)(?:-(\d+)(?::(\d+))?)?$/); if (!m) continue; const a = +m[1], b = m[2] ? +m[2] : a, st = m[3] ? +m[3] : 1; for (let i = a; i <= b; i += st) list.push(i); }
fs.mkdirSync(outdir, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", async (e) => { console.log("[pageerror]", e.message); await b.close(); process.exit(1); });
const [file, q] = url.split("?"); const t0 = Date.now();
await page.goto("file://" + path.resolve(file) + (q ? "?" + q : ""));
await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });
console.log("ready", ((Date.now() - t0) / 1000).toFixed(1) + "s", "bake", await page.evaluate(() => window.__bakeMs) + "ms");
for (const f of list) { const t1 = Date.now(); await page.evaluate((n) => window.__draw(n), f); await page.locator("canvas#c").screenshot({ path: path.join(outdir, `${prefix}${String(f).padStart(4, "0")}.png`) }); console.log(f, ((Date.now() - t1) / 1000).toFixed(2) + "s"); }
await b.close();

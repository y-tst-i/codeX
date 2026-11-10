// 案A+C の静止画を書き出し、ページの計測値(window.__stats: 彫った割合・色版の割合 など)を1行ずつ JSON で出す。
// 使い方: node render_v2.mjs <page.html?query> <out.png> [...]   (../../src/tools/render_still.mjs と同じブラウザの探し方)
import path from "node:path";
import fs from "node:fs";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const mod = process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(mod);
const args = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
page.on("pageerror", async (e) => { console.log("[pageerror]", e.message); await b.close(); process.exit(1); });
for (let i = 0; i < args.length; i += 2) {
  const [file, q] = args[i].split("?");
  await page.goto("file://" + path.resolve(file) + (q ? "?" + q : ""));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await page.locator("canvas#c").screenshot({ path: args[i + 1] });
  console.log(JSON.stringify({ page: q, out: path.basename(args[i + 1]), stats: await page.evaluate(() => window.__stats) }));
}
await b.close();

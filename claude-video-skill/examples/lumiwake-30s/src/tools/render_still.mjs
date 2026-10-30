// 静止画の書き出し: node render_still.mjs <page.html?query> <out.png> [<page2?query> <out2.png> ...]
// ページは window.__ready = true になるまで待つ(フォント読み込み・描画の完了)。1920x1080、等倍。
// playwright はグローバル導入を使う(PLAYWRIGHT_MODULE で上書き可)。ブラウザは CHROME_PATH か playwright の既定。
import path from "node:path";
const mod = process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(mod);
const args = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--allow-file-access-from-files"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
page.on("pageerror", async (e) => { console.log("[pageerror]", e.message); await b.close(); process.exit(1); });
for (let i = 0; i < args.length; i += 2) {
  const [file, q] = args[i].split("?");
  const t0 = Date.now();
  await page.goto("file://" + path.resolve(file) + (q ? "?" + q : ""));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await page.locator("canvas#c").screenshot({ path: args[i + 1] });
  console.log(args[i + 1], ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
await b.close();

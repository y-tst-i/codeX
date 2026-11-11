// 刀の入れ替わり(ちらつき)の検査: 彫りのマスク(白=彫った所)を隣のコマと比べ、「前のコマで彫ってあった画素が、次のコマで墨に戻る」数を数える。
// カットの境目(新しい版木)は数えない。曲のコマ a〜b を順に描く。マスクは print の前の形(版ずれ・刷りの質感は入らない)。
// 使い方: node flicker_check.mjs <a> <b> <out.json> [cam 0|1]   (styleframes_v7.html を v=mask で使う)
// 第2段: 2.5D のカメラが入ると、層が動くので輪郭の画素は毎コマ入れ替わる。刀の入れ替わりは cam=0(層を動かさない同じ絵)で測る
import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), page0 = path.resolve(here, "../../styleframes_v7.html");
const [a, b, out] = [+process.argv[2], +process.argv[3], process.argv[4]], CAM = process.argv[5] == null ? null : +process.argv[5];
const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); process.exit(1); });
await page.goto("file://" + page0 + "?f=" + a + "&v=mask");
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate((CAM) => {
  window.__cam = CAM;
  const c = document.getElementById("c"), ctx = c.getContext("2d", { willReadFrequently: true });
  const cuts = M1_TIMING.shots.map((s) => s.start).concat([1431, 1520]); // 夜明けの構図の切り替え(cand_a7_dawn.js)も新しい版木
  window.__prev = null;
  window.__step = (f) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1920, 1080); A7_DRAW(ctx, { f, look: false, mask: true, cam: window.__cam });
    const d = ctx.getImageData(0, 0, 1920, 1080).data, cur = new Uint8Array(1920 * 1080); let carved = 0;
    for (let i = 0, p = 0; p < cur.length; i += 4, p++) { cur[p] = d[i] > 127 ? 1 : 0; carved += cur[p]; }
    let back = 0, added = 0; const boundary = cuts.includes(f);
    if (window.__prev && !boundary) for (let p = 0; p < cur.length; p++) { if (window.__prev[p] && !cur[p]) back++; else if (!window.__prev[p] && cur[p]) added++; }
    window.__prev = cur;
    return { f, carved, back: boundary ? null : back, added: boundary ? null : added, boundary };
  };
}, CAM);
const rows = [];
for (let f = a; f <= b; f++) { rows.push(await page.evaluate((f) => window.__step(f), f)); if (f % 50 === 0) console.log("f", f); }
const pairs = rows.filter((r) => r.back !== null && r.f !== a);
const worst = pairs.slice().sort((x, y) => y.back - x.back).slice(0, 10);
const res = { range: [a, b], pairs: pairs.length, back_total: pairs.reduce((s, r) => s + r.back, 0), back_max: worst.length ? worst[0].back : 0, frames_with_back: pairs.filter((r) => r.back > 0).length, frames_back_over_50: pairs.filter((r) => r.back > 50).length, worst, rows };
fs.writeFileSync(out, JSON.stringify(res));
console.log(JSON.stringify({ range: res.range, pairs: res.pairs, back_total: res.back_total, back_max: res.back_max, frames_with_back: res.frames_with_back, frames_back_over_50: res.frames_back_over_50, worst: worst.slice(0, 5).map((r) => [r.f, r.back]) }));
await br.close();

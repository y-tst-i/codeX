// 開発用: preview.html でコマを描いて JPEG/PNG に書き出す。決定性の検査(画素の hash)もここ。
//   node frames.mjs out_dir 0,22,48 [--png] [--fx0] [--test name]   … 指定したコマを書く
//   node frames.mjs --hash 5,227,840,435 … 各コマの画素の hash を順・逆・飛ばしの順で描いて比べる
import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const args = process.argv.slice(2), flag = (n) => args.includes(n), val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("[page]", m.text()); });
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); process.exit(1); });
const qs = [flag("--fx0") ? "fx=0" : "", val("--hs") ? "hs=" + val("--hs") : ""].filter(Boolean).join("&");
await page.goto("file://" + path.join(here, "..", "preview.html") + (qs ? "?" + qs : ""));
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const parse = (s) => s.split(",").flatMap((x) => { if (x.includes("-")) { const [a, c, st] = x.split(/[-:]/).map(Number); const o = []; for (let f = a; f <= c; f += st || 1) o.push(f); return o; } return [Number(x)]; });
if (flag("--hash")) {
  const fr = parse(val("--hash")); const run = async (order) => { const o = {}; for (const f of order) o[f] = await page.evaluate((f) => { FILM2.renderAt(window.__ctx, f); const d = window.__ctx.getImageData(0, 0, 1920, 1080).data; let h = 2166136261; for (let i = 0; i < d.length; i += 3) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }, f); return o; };
  const A = await run(fr), B = await run([...fr].reverse()), sk = [...fr].sort((x, y) => ((x * 7919) % 97) - ((y * 7919) % 97)), C = await run(sk);
  let bad = 0; for (const f of fr) { const same = A[f] === B[f] && A[f] === C[f]; bad += !same; console.log(f, A[f], B[f], C[f], same ? "same" : "DIFF"); }
  console.log(bad ? `DIFF ${bad}` : "ALL SAME"); await b.close(); process.exit(bad ? 1 : 0);
}
const out = args[0], fr = parse(args[1]); fs.mkdirSync(out, { recursive: true });
const png = flag("--png"), test = val("--test");
for (const f of fr) {
  const t0 = Date.now();
  const url = await page.evaluate(([f, png, test]) => { if (test) FILM2.test(window.__ctx, test, f); else FILM2.renderAt(window.__ctx, f); return document.getElementById("c").toDataURL(png ? "image/png" : "image/jpeg", 0.9); }, [f, png, test]);
  const file = path.join(out, `${test ? test + "_" : ""}f${String(f).padStart(3, "0")}.${png ? "png" : "jpg"}`);
  fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64")); console.log(file, ((Date.now() - t0) / 1000).toFixed(2) + "s");
}
await b.close();

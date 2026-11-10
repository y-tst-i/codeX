// 決定性の検査: HyperFrames のプロジェクト(index.html)をブラウザで開き、全 180 コマを
//   A 順(gsap のタイムラインを tl.seek(t, false))/ B 逆順(hf-seek の出来事)/ C 飛ばし(固定シードの並べ替え、tl.seek)/ D 飛ばし2(別の並べ替え、hf-seek)
// の4通りで描き、canvas の画素の hash を比べる。さらに HyperFrames の実レンダリング(--format png-sequence)の PNG を同じページで読み、同じ hash になるかを見る。
// 使い方: node seek_check.mjs <HFプロジェクト> <png-sequence のフォルダ|-> <out.json>
import path from "node:path"; import fs from "node:fs";
function findChrome() { const root = "/opt/pw-browsers"; const d = fs.readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); const sub = fs.readdirSync(path.join(root, d)).find((n) => n.startsWith("chrome-linux")); return path.join(root, d, sub, "chrome"); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
const [hf, seq, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || findChrome(), args: ["--allow-file-access-from-files"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); process.exit(1); });
await page.goto("file://" + path.resolve(hf, "index.html"));
await page.waitForFunction(() => !!(window.__timelines && window.__timelines.pilot6s), null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  window.__hash = (c) => { const d = c.getContext("2d").getImageData(0, 0, 1920, 1080).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { if ((i & 3) === 3) continue; h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }; // RGB だけ
  window.__at = (f, how) => { const t = f / 30; if (how === "tl") window.__timelines.pilot6s.seek(t, false); /* gsap の seek は既定で onUpdate を止めるので false */ else window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: t } })); return window.__hash(document.getElementById("film")); };
});
const N = 180, idx = [...Array(N).keys()];
const perm = (seed) => { let s = seed >>> 0; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); const a = idx.slice(); for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const runs = { A_forward_tl: [idx, "tl"], B_reverse_event: [idx.slice().reverse(), "event"], C_skip_tl: [perm(7), "tl"], D_skip_event: [perm(1234), "event"] };
const H = {};
for (const [name, [order, how]] of Object.entries(runs)) { H[name] = {}; for (const f of order) H[name][f] = await page.evaluate(([f, how]) => window.__at(f, how), [f, how]); console.log(name, "done", order.slice(0, 6).join(","), "…"); }
let bad = 0; const rows = [];
let seqBad = 0, seqN = 0;
const files = seq && seq !== "-" ? fs.readdirSync(seq).filter((n) => n.endsWith(".png")).sort() : [];
for (const f of idx) {
  const hs = Object.keys(runs).map((k) => H[k][f]), same = hs.every((x) => x === hs[0]); bad += !same;
  let hseq = null;
  if (files.length === N) {
    hseq = await page.evaluate(async (url) => { const im = new Image(); im.src = url; await im.decode(); const c = document.createElement("canvas"); c.width = 1920; c.height = 1080; c.getContext("2d").drawImage(im, 0, 0); return window.__hash(c); }, "file://" + path.resolve(seq, files[f]));
    seqN++; if (hseq !== hs[0]) seqBad++;
  }
  rows.push({ frame: f, song: 141 + f, hashes: hs, same, hf_render_png: hseq, hf_match: hseq === null ? null : hseq === hs[0] });
}
const res = { frames: N, orders: Object.fromEntries(Object.entries(runs).map(([k, [o, how]]) => [k, { how, first: o.slice(0, 8) }])), seek_diff_frames: bad, hf_png_compared: seqN, hf_png_diff_frames: seqBad, verdict: bad === 0 && seqBad === 0 ? "ALL_SAME" : "DIFF", rows };
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ seek_diff_frames: bad, hf_png_compared: seqN, hf_png_diff_frames: seqBad, verdict: res.verdict }));
await b.close();

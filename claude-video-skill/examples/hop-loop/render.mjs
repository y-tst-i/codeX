// render.mjs  usage: node render.mjs [anim.html] [frames] [fps] [outdir]
// ページを ?render=1 で開き、t = i / fps で renderAt を呼んで、0〜N-1 コマを PNG で保存する(motion-lab.md §2, §7)。
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
// require 経由で読む(全体に入れた playwright も NODE_PATH で見つかる。プロジェクトに入れた物でも動く)
const { chromium } = createRequire(import.meta.url)('playwright');

const [file = 'anim.html', frames = '240', fps = '60', outdir = 'out/frames'] = process.argv.slice(2);
const N = Number(frames), FPS = Number(fps);
mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
await page.goto(pathToFileURL(resolve(file)).href + '?render=1');
await page.waitForFunction(() => window.__ready === true);
for (let i = 0; i < N; i++) {
  const b64 = await page.evaluate((t) => {
    window.renderAt(t);
    return document.getElementById('c').toDataURL('image/png').split(',')[1];
  }, i / FPS);
  writeFileSync(`${outdir}/${String(i).padStart(4, '0')}.png`, Buffer.from(b64, 'base64'));
}
await browser.close();
console.log(`${N} frames -> ${outdir}`);

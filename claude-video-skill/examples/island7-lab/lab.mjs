// 見る・測る道具(motion-lab.md §5・§6)。ページは http で開く(ES モジュールは file:// で読めない)。
//   node lab.mjs stills <samples> <frame...>   → out/stills/NNNN.png(2160。確認中は samples=1 で速く)
//   node lab.mjs state                         → out/state.json(全 480 コマの位置。check.py が読む)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [cmd, ...rest] = process.argv.slice(2);
const URL = process.env.LAB_URL || 'http://127.0.0.1:8767/anim.html';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
const samples = cmd === 'stills' ? rest.shift() : '1';
await page.goto(`${URL}?render=1&samples=${samples}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
mkdirSync('out/stills', { recursive: true });
const t0 = Date.now();
if (cmd === 'stills') {
  for (const f of rest.map(Number)) {
    const b64 = await page.evaluate(t => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, f / 60);
    writeFileSync(`out/stills/${String(f).padStart(4, '0')}.png`, Buffer.from(b64, 'base64'));
  }
  console.log(`${rest.length} stills (${samples} samples) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else if (cmd === 'state') {
  const all = await page.evaluate(() => Array.from({ length: 480 }, (_, f) => window.__state(f / 60)));
  const face = await page.evaluate(() => ({ frame: window.__faceFrame, unsolved: window.__unsolved, state: window.__state(window.__faceFrame / 60) }));   // 数字が向く正確な時刻
  writeFileSync('out/state.json', JSON.stringify(all)); writeFileSync('out/face.json', JSON.stringify(face)); console.log(`state of ${all.length} frames`);
}
await browser.close();

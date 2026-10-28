// 書き出し: node render.cjs stills 0 1.25 3.75 ...   → work/stills/t_<秒>.png
//           node render.cjs frames [from] [to]        → work/frames/0000.png ... (既定 0〜449)
// window.renderAt(t) を呼んでから canvas を PNG で取り出す(t = frame / 30)。
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const HERE = __dirname;
const HTML = 'file://' + path.join(HERE, 'hitotsuzutsu.html') + '?t=0';
const FPS = 30, N = 450;

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exitCode = 2; });
  await page.goto(HTML);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const grab = async t => {
    const url = await page.evaluate(tt => { window.renderAt(tt); return document.getElementById('c').toDataURL('image/png'); }, t);
    return Buffer.from(url.split(',')[1], 'base64');
  };
  if (mode === 'stills') {
    const dir = path.join(HERE, 'work', process.env.STILLS || 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of rest) { const t = parseFloat(s); fs.writeFileSync(path.join(dir, `t_${t.toFixed(3)}.png`), await grab(t)); }
    console.log('stills:', rest.length);
  } else if (mode === 'frames') {
    const dir = path.join(HERE, 'work', process.env.FRAMES || 'frames'); fs.mkdirSync(dir, { recursive: true });
    const from = parseInt(rest[0] || '0', 10), to = parseInt(rest[1] || String(N - 1), 10);
    const t0 = Date.now();
    for (let f = from; f <= to; f++) {
      fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.png'), await grab(f / FPS));
      if (f % 30 === 0) console.log(`frame ${f} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    console.log('done', from, to);
  } else {
    console.log('usage: node render.cjs stills <t...> | frames [from] [to]');
  }
  await browser.close();
})();

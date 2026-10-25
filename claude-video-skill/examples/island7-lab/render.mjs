// 本番の書き出し(motion-lab.md §7、CTRL+Z の手順): 2160 で描き、1コマ 16 サンプル → Lanczos で 1080 → 無劣化の FFV1 で 60 コマずつ区切る。
// 区切りは出来上がったら名前を確定するので、止まっても続きから再開できる。並列: 区切りの番号を分けて複数起動する。
//   node render.mjs <区切りの番号...>   例: node render.mjs 0 3 6   (0〜7。1つ = 60 コマ = 1 秒)
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.LAB_URL || 'http://127.0.0.1:8767/anim.html', CH = 60;
mkdirSync('out/chunks', { recursive: true });
const todo = process.argv.slice(2).map(Number).filter(c => !existsSync(`out/chunks/c${c}.mkv`));
if (!todo.length) { console.log('全部できている'); process.exit(0); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
await page.goto(`${URL}?render=1&samples=16`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
for (const c of todo) {
  const part = `out/chunks/c${c}.part.mkv`, t0 = Date.now();
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-i', '-', '-vf', 'scale=1080:1080:flags=lanczos', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv444p', part], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = c * CH; f < (c + 1) * CH; f++) {
    const b64 = await page.evaluate(t => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, f / 60);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise((res, rej) => ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg ' + code))));
  renameSync(part, `out/chunks/c${c}.mkv`); console.log(`区切り ${c} (${c * CH}〜${(c + 1) * CH - 1}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

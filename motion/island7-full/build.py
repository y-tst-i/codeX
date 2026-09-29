"""オープニング(75s) + ルール説明(125s) を 1 枚の単体 HTML(音源埋め込み)にまとめる。

  python3 build.py   # -> index.html （island7-opening / island7-explainer の index.html と bgm.mp3 が元）
"""
import base64, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(HERE, '..')

def module(name):
    s = open(os.path.join(M, name, 'index.html'), encoding='utf-8').read()
    a = s.index('"use strict";') + len('"use strict";')
    b = s.index('/* =====================================================================\n   再生')
    return s[a:b]

def b64(name, f='bgm.mp3'):
    return base64.b64encode(open(os.path.join(M, name, f), 'rb').read()).decode()

op, ex = module('island7-opening'), module('island7-explainer')
op = re.sub(r'/\*\s*ISLAND 7 オープニングムービー.*?\*/', '', op, count=1)
ex = re.sub(r'/\*\s*ISLAND 7 ルール説明動画.*?\*/', '', ex, count=1)

HTML = r'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ISLAND 7 オープニング＋ルール説明</title>
<style>
  :root{color-scheme:dark;--bg:#000;--fg:#e8f6ff;--dim:#8fb0c4;--acc:#5cf0e0;--line:#1c3347}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--fg);font-family:"Hiragino Sans","Noto Sans JP",system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
  body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
  #wrap{position:relative;width:min(100vw,calc((100vh - 130px)*16/9));background:#000}
  #wrap:fullscreen{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
  #wrap:fullscreen canvas{width:min(100vw,calc(100vh*16/9))}
  canvas{display:block;width:100%;aspect-ratio:16/9;background:#000}
  #poster{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;background:rgba(0,0,0,.5)}
  #poster b{font:700 clamp(12px,2.6vw,20px) ui-monospace,Menlo,monospace;letter-spacing:.3em;color:var(--acc)}
  #poster span{width:clamp(56px,10vw,92px);height:clamp(56px,10vw,92px);border-radius:50%;border:2px solid var(--acc);display:grid;place-items:center;font-size:clamp(22px,4.4vw,38px);color:var(--acc);background:rgba(0,20,30,.5);box-shadow:0 0 34px #5cf0e066}
  #poster i{font-style:normal;font-size:clamp(11px,2.3vw,14px);color:var(--dim)}
  #ui{width:min(100vw,900px);padding:10px 16px 16px;display:flex;flex-direction:column;gap:8px}
  #wrap:fullscreen~#ui{display:none}
  #row{display:flex;align-items:center;gap:10px}
  button{font:inherit;color:var(--fg);background:#0d1f31;border:1px solid var(--line);border-radius:999px;padding:8px 14px;min-height:40px;cursor:pointer}
  #pp{min-width:56px;font-weight:800}
  input[type=range]{flex:1;min-width:0;accent-color:var(--acc);height:28px}
  #volw{display:flex;align-items:center;gap:4px;font-size:16px}
  #vol{width:90px;flex:none}
  #time{font:13px ui-monospace,Menlo,monospace;color:var(--dim);white-space:nowrap}
  #chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  #chips button{flex:none;font-size:12px;padding:6px 11px;min-height:32px;color:var(--dim)}
  #chips button.cur{color:var(--acc);border-color:var(--acc)}
  #hint{position:absolute;left:0;right:0;top:8px;text-align:center;font-size:12px;color:var(--dim);pointer-events:none}
</style>
</head>
<body>
<div id="wrap">
  <canvas id="c" width="1920" height="1080"></canvas>
  <div id="poster"><b>ISLAND 7</b><span>▶</span><i>タップで最初から再生（音が出ます・約3分20秒）</i></div>
  <div id="hint"></div>
</div>
<div id="ui"><div id="row"><button id="pp">▶</button><input id="seek" type="range" min="0" max="200" step="0.05" value="0"><div id="time">0:00 / 3:20</div><label id="volw" title="音量">🔊<input id="vol" type="range" min="0" max="1" step="0.01" value="0.5"></label><button id="bgm" title="BGM 切り替え">BGM: HEAVY</button><button id="fs" title="全画面">⛶</button></div><div id="chips"></div></div>
<script>
"use strict";
/* ISLAND 7 オープニング(0:00–1:15) + ルール説明(1:15–3:20)。BGM は gen_bgm.py で合成した mp3 を埋め込み。
   映像は 2 つの自己完結モジュールを、それぞれの秒数のまま連結している（build.py で生成）。 */
const OP=(()=>{
@@OP@@
return {render};})();
const EX=(()=>{
@@EX@@
return {render,CH};})();
const T0=75,DUR=200;
function render(t){t=Math.min(Math.max(t,0),DUR-.001);if(t<T0)OP.render(t);else EX.render(t-T0);}

/* ---- 再生（2 本の mp3 を 1 本につないで同期）---- */
const AUDIO={heavy:["@@H1@@","@@H2@@"],cinematic:["@@A1@@","@@A2@@"]};let mode="heavy";const CACHE={};
const $=id=>document.getElementById(id),pp=$("pp"),seek=$("seek"),timeEl=$("time"),poster=$("poster"),hint=$("hint");
let AC=null,BUF=null,src=null,gain=null,playing=false,off=0,st=0,loadP=null,seeking=false,resumeAfter=false;
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
function toBuf(s){const r=atob(s),a=new Uint8Array(r.length);for(let i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a.buffer;}
function dec(s){return new Promise((res,rej)=>{try{const p=AC.decodeAudioData(toBuf(s),res,rej);if(p&&p.catch)p.catch(rej);}catch(e){rej(e);}});}
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]);
function load(){if(CACHE[mode]){BUF=CACHE[mode];return Promise.resolve();}if(loadP)return loadP;const md=mode;loadP=withTimeout(Promise.all(AUDIO[md].map(dec)),15000).then(([a,b])=>{
  const sr=a.sampleRate,n1=Math.round(T0*sr),n2=Math.round((DUR-T0)*sr),out=AC.createBuffer(2,n1+n2,sr);
  for(let c=0;c<2;c++){const d=out.getChannelData(c);d.set(a.getChannelData(Math.min(c,a.numberOfChannels-1)).subarray(0,n1),0);d.set(b.getChannelData(Math.min(c,b.numberOfChannels-1)).subarray(0,n2),n1);}
  CACHE[md]=out;loadP=null;if(md===mode)BUF=out;}).catch(e=>{console.warn("audio",e);loadP=null;hint.textContent="音声を読み込めませんでした（映像のみ再生）。もう一度再生を押すと再試行します";});return loadP;}
const now=()=>playing?off+(AC.currentTime-st):off;
async function play(from){
  if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();gain=AC.createGain();gain.gain.value=vol2g(+$("vol").value);gain.connect(AC.destination);}
  if(AC.state==="suspended")await Promise.race([AC.resume(),new Promise(r=>setTimeout(r,1500))]);
  hint.textContent="音声を読み込み中…";try{await load();}catch(e){}if(BUF)hint.textContent="";
  stopSrc();off=from===undefined?(off>=DUR-.1?0:off):from;
  if(BUF){src=AC.createBufferSource();src.buffer=BUF;src.connect(gain);src.start(0,Math.min(off,BUF.duration-.01));}
  st=AC.currentTime;playing=true;pp.textContent="⏸";poster.style.display="none";
}
function stopSrc(){if(src){try{src.stop();}catch(e){}src.disconnect();src=null;}}
function pause(){if(!playing)return;off=now();playing=false;stopSrc();pp.textContent="▶";}
pp.onclick=()=>playing?pause():play();
poster.onclick=()=>play(0);
seek.oninput=()=>{if(!seeking)resumeAfter=playing;seeking=true;if(playing)pause();off=+seek.value;render(off);timeEl.textContent=`${fmt(off)} / ${fmt(DUR)}`;};
seek.onchange=()=>{seeking=false;if(resumeAfter)play(off);};
const vol2g=v=>v*v;
try{const v=localStorage.getItem("i7vol");if(v!==null)$("vol").value=v;}catch(e){}
$("vol").oninput=()=>{const v=+$("vol").value;if(gain)gain.gain.setTargetAtTime(vol2g(v),AC.currentTime,.03);try{localStorage.setItem("i7vol",v);}catch(e){}};
addEventListener("keydown",e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();const s=$("vol");s.value=Math.min(1,Math.max(0,+s.value+(e.key==="ArrowUp"?.05:-.05)));s.oninput();}});
$("bgm").onclick=()=>{mode=mode==="heavy"?"cinematic":"heavy";$("bgm").textContent="BGM: "+(mode==="heavy"?"HEAVY":"CINEMATIC");BUF=CACHE[mode]||null;if(playing)play(now());};
$("fs").onclick=()=>{const w=$("wrap");if(document.fullscreenElement)document.exitFullscreen();else if(w.requestFullscreen)w.requestFullscreen();};
addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();pp.click();}else if(e.key==="f")$("fs").click();else if(e.key==="ArrowRight")play(Math.min(DUR-1,now()+5));else if(e.key==="ArrowLeft")play(Math.max(0,now()-5));});
const CHS=[[0,"OPENING"],...EX.CH.map(([c,n],i)=>[T0+c,i===0?"BRIEFING":n])];
const chipEls=CHS.map(([c,n],i)=>{const b=document.createElement("button");b.textContent=`${String(i).padStart(2,"0")} ${n}`;b.onclick=()=>play(c);$("chips").appendChild(b);return b;});
let last=0,lastT=-1;
function loop(ts){requestAnimationFrame(loop);if(ts-last<28)return;last=ts;
  let t=now();if(playing&&t>=DUR){pause();off=DUR;t=DUR;pp.textContent="↻";}
  if(playing||t!==lastT){render(t);lastT=t;}
  if(!seeking){seek.value=t;timeEl.textContent=`${fmt(Math.min(t,DUR))} / ${fmt(DUR)}`;}
  chipEls.forEach((b,i)=>b.classList.toggle("cur",t>=CHS[i][0]&&(i===CHS.length-1||t<CHS[i+1][0])));}
off=65.6;render(off);off=0;lastT=0;requestAnimationFrame(loop);
window.__render=render;
</script>
</body>
</html>
'''
out = HTML.replace('@@OP@@', op).replace('@@EX@@', ex).replace('@@A1@@', b64('island7-opening')).replace('@@H1@@', b64('island7-opening', 'bgm_heavy.mp3')).replace('@@H2@@', b64('island7-explainer', 'bgm_heavy.mp3')).replace('@@A2@@', b64('island7-explainer'))
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(out)
print('wrote index.html', round(len(out) / 1e6, 2), 'MB')

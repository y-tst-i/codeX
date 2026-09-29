"""BGM 生成スクリプトを実行し、完成した音から「ドン」と鳴る位置（キック・スネア・衝撃音）を検出して
映像側 index.html の HITS に書き込む。画面の脈動を、実際に鳴っている音に合わせるため。

  python3 audio/extract_hits.py   # motion/ で実行
"""
import importlib.util, io, contextlib, json, os, re, sys
import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
SR, HOP = 44100, 441  # 10ms

def render(path):
    spec = importlib.util.spec_from_file_location('g', path); g = importlib.util.module_from_spec(spec)
    cwd = os.getcwd(); os.chdir(os.path.dirname(path)); sys.argv = [path]
    try:
        with contextlib.redirect_stdout(io.StringIO()): spec.loader.exec_module(g)
    finally: os.chdir(cwd)
    return (g.mx.out if hasattr(g, 'mx') else g.mix).mean(0)

def onsets(x):
    def env(lo, hi):
        sos = signal.butter(4, [lo, hi] if lo else hi, 'band' if lo else 'low', fs=SR, output='sos')
        e = np.sqrt(np.maximum(0, uniform_filter1d(signal.sosfilt(sos, x) ** 2, HOP)[::HOP])) + 1e-5
        return 20 * np.log10(e)
    lo, mid = env(0, 160), env(1500, 6000)
    def flux(e): d = np.maximum(0, e[3:] - e[:-3]); return np.concatenate([np.zeros(3), d])
    f = flux(lo) + .6 * flux(mid)
    lvl = np.maximum(lo, mid - 3)
    peaks, pr = signal.find_peaks(f, height=7, distance=10)
    out = []
    for p in peaks:
        loud = np.clip((lvl[min(p + 2, lvl.size - 1)] + 42) / 30, 0, 1)   # 大きい音ほど強く
        s = float(np.clip(pr['peak_heights'][list(peaks).index(p)] / 22, 0, 1) * loud)
        if s > .25: out.append([round(p * HOP / SR - .02, 3), round(s, 2)])
    return out

TARGETS = {'island7-opening': ('gen_bgm.py', 'gen_bgm_heavy.py'), 'island7-explainer': ('gen_bgm.py', 'gen_bgm_heavy.py')}
for d, (cin, hev) in TARGETS.items():
    hits = {'cinematic': onsets(render(os.path.join(ROOT, d, cin))), 'heavy': onsets(render(os.path.join(ROOT, d, hev)))}
    p = os.path.join(ROOT, d, 'index.html'); s = open(p, encoding='utf-8').read()
    block = '/*HITS*/const HITS=' + json.dumps(hits, separators=(',', ':')) + ';/*/HITS*/'
    if '/*HITS*/' in s: s = re.sub(r'/\*HITS\*/.*?/\*/HITS\*/', lambda m: block, s, flags=re.S)
    else: s = s.replace('const cv=document.getElementById("c")', block + '\nconst cv=document.getElementById("c")', 1)
    open(p, 'w', encoding='utf-8').write(s)
    print(d, {k: len(v) for k, v in hits.items()})

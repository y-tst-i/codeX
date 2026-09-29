#!/usr/bin/env python3
"""ISLAND 7 TikTok用ティーザー動画（縦型1080x1920・音声/セリフ付き）を生成する。

映像・BGM・効果音・ナレーションをすべてコードから合成する。外部素材は不要。

必要なもの:
    pip install numpy pillow imageio-ffmpeg pyopenjtalk-plus

実行:
    python3 promo/tiktok/make_tiktok.py            # 本番（30fps）
    python3 promo/tiktok/make_tiktok.py --preview  # 確認用（静止画シート＋音声のみ）
"""
from __future__ import annotations

import argparse
import math
import os
import random
import subprocess
import sys
import wave
from functools import lru_cache
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "out"
FONT = str(HERE / "fonts" / "DelaGothicOne-Regular.ttf")
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

W, H = 1080, 1920
FPS = 30
SR = 48000
BPM = 128
BEAT = 60 / BPM

YELLOW = (255, 214, 0)
RED = (255, 48, 72)
CYAN = (0, 230, 255)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# ---------------------------------------------------------------------------
# 台本：各シーン＝（画面に出す文字, 読み上げ文）の並び
# ---------------------------------------------------------------------------
SCENES = [
    dict(key="hook", lead=0.05, gap=0.10, captions=False, lines=[
        ("7日後、", "なのかご、"),
        ("この島に", "この島に、"),
        ("最大級の嵐が来る。", "最大級の、嵐が来る。"),
    ]),
    dict(key="countdown", lead=0.15, gap=0.10, captions=True, lines=[
        ("残された時間は", "残された時間は、"),
        ("たった6日間。", "たった、むいかかん。"),
    ]),
    dict(key="actions", lead=0.10, gap=0.22, captions=True, lines=[
        ("やれることは3つだけ。", "やれることは、三つだけ。"),
        ("探索。", "探索。"),
        ("整備。", "整備。"),
        ("設置。", "設置。"),
    ]),
    dict(key="abilities", lead=0.10, gap=0.12, captions=True, lines=[
        ("防護", "防護。"),
        ("排水", "排水。"),
        ("アクセス", "アクセス。"),
        ("ライフライン", "ライフライン。"),
        ("島を育てろ。", "島を、育てろ！"),
    ]),
    dict(key="typhoon", lead=0.25, gap=0.12, captions=True, lines=[
        ("そして7日目。", "そして、なのかめ。"),
        ("超大型台風が", "超大型台風が、"),
        ("上陸する。", "上陸する。"),
    ]),
    dict(key="question", lead=0.15, gap=0.18, captions=False, lines=[
        ("あなたなら", "あなたなら、"),
        ("何を守る？", "何を守る？"),
        ("コメントで教えて！", "コメントで、教えて！"),
    ]),
    dict(key="logo", lead=0.20, gap=0.20, captions=False, lines=[
        ("ISLAND 7", "アイランド、セブン。"),
        ("チームで、生き延びろ。", "チームで、生き延びろ。"),
    ], tail=1.4),
]

# ---------------------------------------------------------------------------
# ナレーション合成とタイムライン
# ---------------------------------------------------------------------------


def synth_voice(text: str) -> np.ndarray:
    import pyopenjtalk

    x, sr = pyopenjtalk.tts(text, speed=1.12, half_tone=1.0)
    x = x.astype(np.float64)
    if sr != SR:
        idx = np.arange(0, len(x), sr / SR)
        x = np.interp(idx, np.arange(len(x)), x)
    # 前後の無音を詰める
    a = np.abs(x)
    nz = np.where(a > a.max() * 0.02)[0]
    x = x[max(0, nz[0] - 200): nz[-1] + 1200]
    return x / (np.abs(x).max() + 1e-9)


def build_timeline():
    """シーン長とセリフ開始時刻を決める。シーンの切れ目は2拍単位に揃える。"""
    t = 0.0
    timeline = []
    voices = []
    for sc in SCENES:
        clips, starts = [], []
        cur = sc["lead"]
        for disp, spoken in sc["lines"]:
            v = synth_voice(spoken)
            starts.append(cur)
            clips.append(v)
            cur += len(v) / SR + sc["gap"]
        need = cur - sc["gap"] + sc.get("tail", 0.45)
        unit = BEAT * 2
        dur = math.ceil(need / unit) * unit
        timeline.append(dict(key=sc["key"], start=t, dur=dur, cues=starts,
                             ends=[s + len(c) / SR for s, c in zip(starts, clips)],
                             texts=[d for d, _ in sc["lines"]], captions=sc["captions"]))
        for s, c in zip(starts, clips):
            voices.append((t + s, c))
        t += dur
    return timeline, voices, t


# ---------------------------------------------------------------------------
# オーディオ（BGM・効果音・ミックス）
# ---------------------------------------------------------------------------
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name: str) -> float:
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + (o - 4) * 12 - 9) / 12)


CHORDS = [  # Am - F - C - G（1小節ずつ）
    ("A1", ["A3", "C4", "E4"]),
    ("F1", ["F3", "A3", "C4"]),
    ("C2", ["G3", "C4", "E4"]),
    ("G1", ["G3", "B3", "D4"]),
]


def saw(freq, n, harmonics=14, bright=1.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, harmonics + 1):
        if freq * k > SR / 2.2:
            break
        out += np.sin(2 * np.pi * freq * k * t) / k * math.exp(-(k - 1) * (0.35 / bright))
    return out


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    t = np.arange(n) / SR
    L = n / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip((L - t) / max(r, 1e-6), 0, 1)
    return e * rel


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, len(x))


def reverb(x, secs=1.6, mix=0.25, seed=3):
    rng = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / secs))
    ir = fft_filter(ir, lo=200, hi=6000)
    ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n
    size = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + y * mix * 2.2


def add(buf, sig, t0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def s_kick(strength=1.0):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.22)
    click = np.random.default_rng(1).standard_normal(n) * np.exp(-t / 0.003) * 0.3
    return np.tanh((x + click) * 1.6 * strength) * 0.9


def s_clap():
    rng = np.random.default_rng(2)
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        e += np.where(t >= off, np.exp(-(t - off) / (0.008 if off < 0.02 else 0.09)), 0)
    return fft_filter(rng.standard_normal(n), lo=900, hi=5000) * e * 0.9


def s_hat(open_=False, seed=0):
    rng = np.random.default_rng(10 + seed)
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    x = fft_filter(rng.standard_normal(n), lo=7000)
    return x * np.exp(-t / (0.07 if open_ else 0.012)) * (0.35 if open_ else 0.25)


def s_tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.004) * 0.35


def s_808(freq, dur, drive=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph)
    return np.tanh(x * drive) * env_adsr(n, 0.002, 0.5, 0.55, 0.06) * 0.6


def s_impact(dur=2.2):
    rng = np.random.default_rng(5)
    n = int(dur * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6)
    noise = fft_filter(rng.standard_normal(n), hi=2500) * np.exp(-t / 0.35) * 0.5
    return np.tanh((boom * 1.3 + noise) * 1.4) * 0.9


def s_thunder(dur=2.8, seed=7):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fft_filter(rng.standard_normal(n), hi=700)
    crack = fft_filter(rng.standard_normal(n), lo=1500) * np.exp(-t / 0.05) * 0.6
    rumble_env = np.exp(-t / 0.9) * (1 + 0.5 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t))
    return (x * rumble_env * 2.0 + crack) * 0.55


def s_riser(dur):
    rng = np.random.default_rng(9)
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal(n)
    # 時間とともに明るくなるノイズ（区間ごとにフィルタ）
    out = np.zeros(n)
    seg = 8
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg
        out[a:b] = fft_filter(noise[a:b], lo=300 + 5000 * (k / seg) ** 2)
    f = 200 + 1400 * p ** 2
    sweep = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (out * 0.5 + sweep) * p ** 2 * 0.8


def s_whoosh(dur=0.45, seed=4):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.sin(np.pi * t / dur) ** 2
    return fft_filter(rng.standard_normal(n), lo=600, hi=4000) * e * 0.45


def s_pop(freq=880):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.8 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04) * 0.4


def s_pluck(freq, dur=0.22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = saw(freq, n, harmonics=10, bright=0.6) + 0.5 * saw(freq * 1.004, n, harmonics=10, bright=0.6)
    return x * np.exp(-t / 0.09) * 0.22


def s_pad(freqs, dur):
    n = int(dur * SR)
    x = np.zeros(n)
    for f in freqs:
        for det in (0.996, 1.0, 1.005):
            x += saw(f * det, n, harmonics=8, bright=0.5)
    return x * env_adsr(n, 0.25, 0.6, 0.8, 0.3) * 0.06


def s_siren(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 620 + 180 * np.sin(2 * np.pi * 0.9 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    fade = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    return x * fade * 0.06


def s_bell(freq, dur=1.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * freq * r * t) * a * np.exp(-t / (0.9 / r)) for r, a in ((1, 1), (2.01, 0.5), (3.02, 0.25)))
    return x * 0.18


def section_at(timeline, t):
    for sc in timeline:
        if sc["start"] <= t < sc["start"] + sc["dur"]:
            return sc
    return timeline[-1]


def build_audio(timeline, voices, total):
    n = int((total + 0.2) * SR)
    drums = np.zeros(n)
    bass = np.zeros(n)
    music = np.zeros(n)
    fx = np.zeros(n)
    vox = np.zeros(n)

    S = {sc["key"]: sc for sc in timeline}
    kick_times = []
    step = BEAT / 4
    nsteps = int(total / step)
    hat_rng = random.Random(4)
    for i in range(nsteps):
        t = i * step
        sc = section_at(timeline, t)
        k = sc["key"]
        s16 = i % 16
        beat_i = i // 4
        bar = i // 16
        root, chord = CHORDS[bar % 4]
        end_of_scene = sc["start"] + sc["dur"]
        in_dropout = k == "abilities" and t >= end_of_scene - BEAT
        if in_dropout:
            continue
        if k == "hook":
            if s16 % 4 == 0:
                add(fx, s_tick(), t)
        elif k == "countdown":
            if s16 in (0, 10):
                add(drums, s_kick(0.9), t); kick_times.append(t)
            if s16 in (4, 12):
                add(drums, s_clap() * 0.7, t)
            if s16 % 2 == 0:
                add(drums, s_hat(seed=i % 5), t)
            if s16 % 4 == 0:
                add(fx, s_tick() * 0.8, t)
        elif k in ("actions", "abilities", "typhoon"):
            if s16 % 4 == 0:
                add(drums, s_kick(1.1 if k == "typhoon" else 1.0), t); kick_times.append(t)
            if s16 in (4, 12):
                add(drums, s_clap(), t)
            if s16 % 4 == 2:
                add(drums, s_hat(open_=True, seed=i % 3), t)
            elif k != "actions" or s16 % 2 == 0:
                add(drums, s_hat(seed=i % 5) * (0.6 + 0.4 * hat_rng.random()), t)
        elif k == "question":
            if s16 in (4, 12):
                add(drums, s_clap() * 0.8, t)
            if s16 % 2 == 0:
                add(drums, s_hat(seed=i % 5) * 0.7, t)
            # ロゴ直前はスネアロール
            if t >= end_of_scene - BEAT * 2 and s16 % 1 == 0:
                roll = (t - (end_of_scene - BEAT * 2)) / (BEAT * 2)
                add(drums, s_clap() * (0.25 + 0.6 * roll), t)
        # ベース（808）
        if k in ("countdown", "actions", "abilities", "typhoon") and s16 in (0, 6, 10):
            f = hz(root) * (2 if k != "typhoon" else 1)
            add(bass, s_808(f, step * (6 if s16 == 0 else 4), drive=2.6 if k == "typhoon" else 1.6), t)
        # アルペジオ
        if k in ("actions", "abilities", "question") and not in_dropout:
            if k == "question" or s16 % 2 == 0 or k == "abilities":
                tones = [hz(c) * 2 for c in chord] + [hz(chord[0]) * 4]
                pat = [0, 1, 2, 3, 2, 1, 0, 2]
                add(music, s_pluck(tones[pat[i % 8]]), t)
        # パッド（小節頭）
        if s16 == 0 and k != "logo":
            add(music, s_pad([hz(c) for c in chord], BEAT * 4), t)

    # 効果音
    hook, cd, ac, ab, ty, qu, lg = (S[k] for k in ("hook", "countdown", "actions", "abilities", "typhoon", "question", "logo"))
    add(fx, s_impact() * 1.1, 0.0)
    add(fx, s_thunder(), 0.02)
    add(bass, s_808(hz("A1"), 1.4, 2.0), 0.0)
    add(fx, s_thunder(seed=8) * 1.2, hook["start"] + hook["cues"][2])
    add(fx, s_impact(1.4) * 0.7, hook["start"] + hook["cues"][2])
    for sc in timeline[1:]:
        add(fx, s_whoosh(seed=int(sc["start"] * 10)), sc["start"] - 0.3)
    for j, c in enumerate(ac["cues"][1:]):
        add(fx, s_pop(660 * 2 ** (j * 4 / 12)), ac["start"] + c)
    for j, c in enumerate(ab["cues"][:4]):
        for q in range(7):  # レベルアップ音
            add(fx, s_pop(520 * 2 ** (q * 2 / 12)) * 0.45, ab["start"] + c + q * 0.07)
    add(fx, s_riser(BEAT * 7), ty["start"] - BEAT * 7)
    add(fx, s_impact() * 1.2, ty["start"])
    add(fx, s_thunder(seed=11), ty["start"] + ty["cues"][1])
    add(fx, s_impact(1.2) * 0.9, ty["start"] + ty["cues"][2])
    add(fx, s_siren(ty["dur"]), ty["start"])
    for j, c in enumerate(qu["cues"]):
        add(fx, s_pop(740 + 120 * j), qu["start"] + c)
    add(fx, s_impact(2.8), lg["start"])
    for f in ("A4", "C5", "E5", "A5"):
        add(music, s_bell(hz(f), 2.8), lg["start"] + 0.02)
    add(music, s_pad([hz("A2"), hz("E3"), hz("A3"), hz("C4"), hz("E4")], lg["dur"]) * 2.2, lg["start"])
    add(bass, s_808(hz("A1"), 1.6, 2.0), lg["start"])

    # ナレーション
    for t0, v in voices:
        add(vox, v, t0)
    vox = reverb(fft_filter(vox, lo=90), secs=0.6, mix=0.08)

    # サイドチェイン（キック）とボイスダッキング
    tt = np.arange(n) / SR
    side = np.ones(n)
    for tk in kick_times:
        i0 = int(tk * SR)
        seg = np.arange(min(int(0.3 * SR), n - i0)) / SR
        side[i0:i0 + len(seg)] = np.minimum(side[i0:i0 + len(seg)], 1 - 0.55 * np.exp(-seg / 0.09))
    win = int(0.12 * SR)
    venv = np.convolve(np.abs(vox), np.ones(win) / win, mode="same")
    duck = 1 - 0.5 * np.clip(venv / (venv.max() * 0.15 + 1e-9), 0, 1)
    duck = np.convolve(duck, np.ones(win) / win, mode="same")

    music = reverb(music, secs=2.0, mix=0.3)
    bed = (drums * 0.9 + bass * 0.9 * side + music * side) * duck + fx * (0.6 + 0.4 * duck)
    mix_l = bed + vox * 0.95
    # 簡易ステレオ：音楽を左右でわずかにずらす
    d = int(0.012 * SR)
    music_r = np.concatenate([np.zeros(d), (music * side * duck)[:-d]])
    mix_r = bed - music * side * duck + music_r + vox * 0.95
    st = np.stack([mix_l, mix_r], axis=1)
    fade = np.clip((total - tt) / 0.6, 0, 1)[:, None]
    st *= fade
    # ラウドネスをTikTokの正規化（約-14 LUFS）付近に合わせ、ピークだけ柔らかく抑える
    rms = np.sqrt(np.mean(st ** 2))
    st *= 10 ** (-15.5 / 20) / (rms + 1e-9)
    st = np.where(np.abs(st) > 0.8, np.sign(st) * (0.8 + 0.17 * np.tanh((np.abs(st) - 0.8) / 0.17)), st)
    return st.astype(np.float32)


def write_wav(path, st):
    data = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------------------------------------------------------------------------
# 映像ユーティリティ
# ---------------------------------------------------------------------------


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out_cubic(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_out_back(x, s=1.9):
    x = clamp(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def ease_in_cubic(x):
    x = clamp(x)
    return x ** 3


@lru_cache(maxsize=64)
def font(size):
    return ImageFont.truetype(FONT, size)


@lru_cache(maxsize=512)
def text_img(text, size, fill=WHITE, stroke=0, stroke_fill=BLACK, shadow=0, glow=None):
    f = font(size)
    d0 = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = d0.textbbox((0, 0), text, font=f, stroke_width=stroke)
    pad = 20 + shadow + (40 if glow else 0)
    im = Image.new("RGBA", (r - l + pad * 2, b - t + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    org = (pad - l, pad - t)
    if glow:
        g = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(g).text(org, text, font=f, fill=glow + (255,), stroke_width=stroke + 6, stroke_fill=glow + (255,))
        g = g.filter(ImageFilter.GaussianBlur(18))
        im = Image.alpha_composite(im, g)
        d = ImageDraw.Draw(im)
    if shadow:
        d.text((org[0], org[1] + shadow), text, font=f, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
    d.text(org, text, font=f, fill=fill + (255,), stroke_width=stroke, stroke_fill=stroke_fill + (255,))
    return im


@lru_cache(maxsize=64)
def emoji_img(ch, size):
    f = ImageFont.truetype(EMOJI_FONT, 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    s = size / max(im.size)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)


def paste(base, im, cx, cy, scale=1.0, alpha=1.0, rot=0.0):
    if scale <= 0.01 or alpha <= 0.01:
        return
    if abs(scale - 1) > 1e-3:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if abs(rot) > 0.05:
        im = im.rotate(rot, expand=True, resample=Image.BILINEAR)
    if alpha < 0.999:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    base.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)


def txt(base, text, size, cx, cy, fill=WHITE, stroke=10, scale=1.0, alpha=1.0, rot=0.0, glow=None, shadow=10):
    paste(base, text_img(text, size, fill, stroke, BLACK, shadow, glow), cx, cy, scale, alpha, rot)


@lru_cache(maxsize=16)
def gradient(top, bottom):
    g = np.linspace(0, 1, H)[:, None, None]
    arr = np.array(top)[None, None, :] * (1 - g) + np.array(bottom)[None, None, :] * g
    arr = np.repeat(arr, W, axis=1)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


@lru_cache(maxsize=1)
def radial_mask():
    y, x = np.mgrid[0:H, 0:W]
    r = np.sqrt(((x - W / 2) / (W * 0.6)) ** 2 + ((y - H * 0.42) / (H * 0.4)) ** 2)
    return Image.fromarray((np.clip(1 - r, 0, 1) ** 2 * 255).astype(np.uint8), "L")


@lru_cache(maxsize=1)
def vignette_mask():
    y, x = np.mgrid[0:H, 0:W]
    r = np.sqrt(((x - W / 2) / (W * 0.72)) ** 2 + ((y - H / 2) / (H * 0.62)) ** 2)
    return Image.fromarray((np.clip((r - 0.55) / 0.6, 0, 1) * 200).astype(np.uint8), "L")


def glow(base, color, strength):
    if strength <= 0.01:
        return
    m = radial_mask().point(lambda v: int(v * strength))
    base.paste(Image.new("RGB", (W, H), color), (0, 0), m)


RAIN = [(random.Random(i).random() * W * 1.4, random.Random(i + 999).random() * H,
         0.6 + random.Random(i + 55).random() * 0.8) for i in range(170)]


def rain(d, t, amount=1.0, slant=0.35, color=(160, 200, 255)):
    count = int(len(RAIN) * amount)
    for x0, y0, sp in RAIN[:count]:
        vy = 2600 * sp
        y = (y0 + t * vy) % (H + 200) - 100
        x = (x0 - (y + 100) * slant) % (W + 200) - 100
        ln = 40 * sp
        c = tuple(int(v * (0.5 + 0.4 * sp)) for v in color)
        d.line([(x, y), (x - ln * slant, y - ln)], fill=c, width=3 if sp > 1.1 else 2)


def ocean_grid(d, t, color=(0, 140, 170), horizon=1380):
    """画面下部に流れるパース付きの海グリッド。"""
    for k in range(14):
        p = ((k + t * 1.6) % 14) / 14
        y = horizon + (H - horizon) * p ** 2
        d.line([(0, y), (W, y)], fill=color, width=2)
    for k in range(-8, 9):
        d.line([(W / 2 + k * 30, horizon), (W / 2 + k * 260, H)], fill=color, width=2)


def draw_island(base, cx, cy, s, t):
    d = ImageDraw.Draw(base)
    # 波
    for j in range(3):
        pts = [(x, cy + 70 * s + j * 36 * s + 12 * s * math.sin(x / 70 + t * 3 + j)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=(0, 190 - j * 40, 230 - j * 40), width=int(6 * s))
    # 砂浜と丘
    d.ellipse([cx - 300 * s, cy - 10 * s, cx + 300 * s, cy + 110 * s], fill=(238, 204, 130))
    d.ellipse([cx - 220 * s, cy - 110 * s, cx + 200 * s, cy + 80 * s], fill=(40, 170, 90))
    d.ellipse([cx - 120 * s, cy - 150 * s, cx + 120 * s, cy + 20 * s], fill=(52, 196, 104))
    # ヤシの木
    sway = math.sin(t * 2.2) * 8 * s
    tx, ty = cx + 110 * s, cy - 60 * s
    top = (tx + 40 * s + sway, ty - 230 * s)
    d.line([(tx, ty), (tx + 20 * s + sway / 2, ty - 120 * s), top], fill=(130, 84, 40), width=int(20 * s), joint="curve")
    for a in (-160, -120, -60, -20, 20):
        r = math.radians(a + sway)
        ex, ey = top[0] + math.cos(r) * 150 * s, top[1] + math.sin(r) * 90 * s + 40 * s
        mx, my = (top[0] + ex) / 2, (top[1] + ey) / 2 - 30 * s
        d.polygon([top, (mx, my - 18 * s), (ex, ey), (mx, my + 14 * s)], fill=(30, 150, 70))


def spiral(base, cx, cy, R, ang, color, alpha, width=26):
    size = 540
    sc = size / (2 * R)
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    c = size / 2
    for arm in range(4):
        pts = []
        for i in range(60):
            th = i / 59 * 2.6 * math.pi
            r = (22 + (R - 22) * (th / (2.6 * math.pi)) ** 1.1) * sc
            a = th + ang + arm * math.pi / 2
            pts.append((c + r * math.cos(a), c + r * math.sin(a)))
        d.line(pts, fill=255, width=max(2, int(width * sc)), joint="curve")
    d.ellipse([c - 30 * sc, c - 30 * sc, c + 30 * sc, c + 30 * sc], fill=0)
    m = m.filter(ImageFilter.GaussianBlur(3)).resize((int(2 * R), int(2 * R)), Image.BILINEAR)
    m = m.point(lambda v: int(v * alpha))
    base.paste(Image.new("RGB", m.size, color), (int(cx - R), int(cy - R)), m)


@lru_cache(maxsize=32)
def card_img(emoji, label, w, h, color, num=None, label_size=110):
    im = Image.new("RGBA", (w + 24, h + 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([12, 20, w + 12, h + 20], radius=44, fill=(0, 0, 0, 160))
    d.rounded_rectangle([6, 6, w + 6, h + 6], radius=44, fill=color + (255,), outline=(255, 255, 255, 255), width=6)
    e = emoji_img(emoji, int(h * 0.55))
    ex = 50 if num is None else 110
    im.paste(e, (ex, (h - e.height) // 2 + 6), e)
    lab = text_img(label, label_size, WHITE, 8, BLACK, 6)
    im.paste(lab, (ex + e.width + 10, (h - lab.height) // 2 + 8), lab)
    if num is not None:
        n = text_img(str(num), 70, YELLOW, 8, BLACK, 0)
        im.paste(n, (18, (h - n.height) // 2 + 6), n)
    return im


# ---------------------------------------------------------------------------
# シーン描画
# ---------------------------------------------------------------------------


def appear(lt, cue, dur=0.28):
    return clamp((lt - cue) / dur)


def scene_hook(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((6, 8, 24), (70, 0, 20)), (0, 0))
    spiral(img, W / 2, 760, 700, -T * 1.6, (90, 20, 60), 0.55)
    glow(img, (180, 20, 40), 0.35 + 0.25 * math.sin(T * 7) ** 2)
    rain(ImageDraw.Draw(img), T, 1.0)
    # 「7日後、」
    p = ease_out_cubic(lt / 0.25)
    txt(img, "7日後、", 260, W / 2 + 10, 600, YELLOW, 14, scale=1.55 - 0.55 * p, glow=(255, 120, 0))
    a = appear(lt, c[1], 0.22)
    txt(img, "この島に", 140, W / 2 - (1 - ease_out_cubic(a)) * 500, 900, WHITE, 10, alpha=a)
    a = appear(lt, c[2], 0.2)
    if a > 0:
        txt(img, "最大級の", 150, W / 2, 1100, WHITE, 12, scale=1.6 - 0.6 * ease_out_cubic(a), alpha=a)
        b = appear(lt, c[2] + 0.35, 0.18)
        jit = (random.Random(int(T * 30)).random() - 0.5) * 16 * (1 - b * 0.7)
        txt(img, "嵐が来る。", 200, W / 2 + jit, 1320, RED, 16, scale=1.8 - 0.8 * ease_out_cubic(b),
            alpha=b, glow=(255, 0, 40), rot=-3 * (1 - b) + 2)


def scene_countdown(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((4, 30, 60), (0, 90, 120)), (0, 0))
    glow(img, (0, 200, 255), 0.25 + 0.2 * beat_pulse(T))
    d = ImageDraw.Draw(img)
    ocean_grid(d, T, (0, 120, 150), 1560)
    txt(img, "残された時間", 80, W / 2, 330, CYAN, 8, alpha=appear(lt, 0.0, 0.2))
    day = 1 + min(5, int(max(0, lt - 0.2) / (sc["dur"] * 0.8 / 6)))
    ph = (max(0, lt - 0.2) / (sc["dur"] * 0.8 / 6)) % 1 if day < 6 else 1
    flip = ease_out_back(ph / 0.35)
    txt(img, f"DAY {day}", 250, W / 2, 600, WHITE, 14, scale=0.7 + 0.3 * flip, glow=(0, 180, 255))
    # 日付ドット（7日目は赤）
    for k in range(7):
        x = W / 2 + (k - 3) * 118
        on = k < day
        col = RED if k == 6 else (YELLOW if on else (40, 70, 90))
        r = 40 if not (k == day - 1) else 40 + 10 * (1 - ph)
        d.ellipse([x - r, 860 - r, x + r, 860 + r], fill=col, outline=WHITE, width=5)
        paste(img, text_img(str(k + 1), 44, BLACK if on or k == 6 else (140, 170, 190), 0, BLACK, 0), x, 860)
    paste(img, emoji_img("🌀", 70), W / 2 + 3 * 118, 760, scale=1 + 0.15 * beat_pulse(T))
    draw_island(img, W / 2, 1320, 1.0, T)
    a = appear(lt, c[1], 0.25)
    if a > 0:
        txt(img, "たった6日間", 130, W / 2, 1000, YELLOW, 12, scale=1.4 - 0.4 * ease_out_back(a), alpha=a,
            rot=4)


def scene_actions(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((10, 20, 60), (40, 10, 90)), (0, 0))
    glow(img, (120, 60, 255), 0.25 + 0.25 * beat_pulse(T))
    ocean_grid(ImageDraw.Draw(img), T, (70, 40, 140), 1500)
    a = appear(lt, c[0], 0.25)
    txt(img, "やれることは", 100, W / 2, 330, WHITE, 10, alpha=a)
    b = appear(lt, c[0] + 0.55, 0.25)
    txt(img, "3つだけ", 180, W / 2, 500, YELLOW, 14, scale=1.5 - 0.5 * ease_out_back(b), alpha=b, glow=(255, 150, 0))
    cards = [("🔍", "探索", (0, 150, 200)), ("🔧", "整備", (230, 120, 0)), ("🏗", "設置", (220, 40, 90))]
    for j, (e, lab, col) in enumerate(cards):
        a = appear(lt, c[j + 1] - 0.05, 0.3)
        if a <= 0:
            continue
        im = card_img(e, lab, 820, 210, col, j + 1, 120)
        x = W / 2 + (1 - ease_out_back(a, 1.4)) * 900
        bounce = 1 + 0.04 * beat_pulse(T) if lt > c[j + 1] + 0.4 else 1
        paste(img, im, x, 760 + j * 250, scale=bounce)


LEVEL_ROWS = [("🛡", "防護", (60, 140, 255)), ("💧", "排水", (0, 200, 230)),
              ("🛣", "アクセス", (255, 170, 0)), ("⚡", "ライフライン", (255, 70, 120))]


def scene_abilities(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((6, 40, 30), (0, 80, 70)), (0, 0))
    glow(img, (0, 255, 170), 0.2 + 0.25 * beat_pulse(T))
    ocean_grid(ImageDraw.Draw(img), T, (0, 110, 90), 1560)
    d = ImageDraw.Draw(img)
    title_a = appear(lt, c[4], 0.22)
    txt(img, "4つの能力", 100, W / 2, 330, WHITE, 10, alpha=1 - title_a)
    if title_a > 0:
        txt(img, "島を育てろ！", 140, W / 2, 330, YELLOW, 14, scale=1.5 - 0.5 * ease_out_back(title_a),
            glow=(255, 160, 0), alpha=title_a)
    for j, (e, lab, col) in enumerate(LEVEL_ROWS):
        y = 540 + j * 230
        a = appear(lt, c[j] - 0.05, 0.25)
        if a <= 0:
            continue
        off = (1 - ease_out_cubic(a)) * -700
        paste(img, emoji_img(e, 80), 150 + off, y)
        lab_im = text_img(lab, 80, WHITE, 8, BLACK, 6)
        paste(img, lab_im, 210 + lab_im.width / 2 + off, y)
        lv = 1 + min(6, int(max(0, lt - c[j]) / 0.07))
        maxed = lt >= c[4]
        # バー（7セグメント）
        x0, x1, by = 110 + off, 970 + off, y + 95
        seg_w = (x1 - x0) / 7
        for s in range(7):
            filled = s < lv
            fc = (col if not maxed else (255, 230, 60)) if filled else (20, 50, 45)
            d.rounded_rectangle([x0 + s * seg_w + 5, by - 26, x0 + (s + 1) * seg_w - 5, by + 26], radius=12,
                                fill=fc, outline=WHITE if filled else (60, 90, 80), width=3)
        tag = "MAX" if lv >= 7 else f"Lv.{lv}"
        pop = 1 + 0.3 * (1 - clamp((lt - c[j] - 0.42) / 0.25)) if lv >= 7 else 1
        paste(img, text_img(tag, 64, YELLOW if lv >= 7 else WHITE, 8, BLACK, 4), 900 + off, y, scale=pop)


def scene_typhoon(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((10, 0, 20), (50, 0, 30)), (0, 0))
    spiral(img, W / 2, 800, 620, -T * 5.0, (80, 60, 140), 0.9, 34)
    spiral(img, W / 2, 800, 420, -T * 7.0 + 0.5, (160, 120, 255), 0.5, 20)
    flash = 0.5 + 0.5 * math.sin(T * 14)
    glow(img, (255, 0, 40), 0.25 + 0.35 * flash * (lt > c[1]))
    d = ImageDraw.Draw(img)
    rain(d, T * 1.3, 1.0, 0.8, (200, 180, 255))
    # 警告帯
    off = (T * 240) % 120
    d.rectangle([0, 190, W, 290], fill=YELLOW)
    for k in range(-2, 12):
        x = k * 120 - off
        d.polygon([(x, 190), (x + 60, 190), (x + 160, 290), (x + 100, 290)], fill=BLACK)
    paste(img, text_img("WARNING", 70, YELLOW, 10, BLACK, 0), W / 2, 240)
    a = appear(lt, c[0], 0.22)
    txt(img, "DAY 7", 230, W / 2, 520, RED, 14, scale=1.6 - 0.6 * ease_out_back(a), alpha=a, glow=(255, 0, 0))
    a = appear(lt, c[1], 0.2)
    if a > 0:
        txt(img, "超大型台風", 170, W / 2, 780, WHITE, 14, scale=1.8 - 0.8 * ease_out_cubic(a), alpha=a,
            glow=(160, 100, 255))
    a = appear(lt, c[2], 0.16)
    if a > 0:
        j = random.Random(int(T * 30))
        txt(img, "上陸", 330, W / 2 + (j.random() - 0.5) * 24, 1060 + (j.random() - 0.5) * 24, RED, 18,
            scale=2.2 - 1.2 * ease_out_cubic(a), alpha=a, glow=(255, 30, 30), rot=-4)
    # 島HPバー
    hp_t = clamp((lt - c[1]) / (sc["dur"] - c[1] - 0.2))
    hp = int(round(100 - 88 * ease_out_cubic(hp_t))) if lt > c[1] else 100
    paste(img, text_img("島HP", 60, WHITE, 8, BLACK, 0), 170, 1330)
    d.rounded_rectangle([250, 1300, 880, 1360], radius=20, fill=(30, 0, 10), outline=WHITE, width=5)
    col = (60, 220, 100) if hp > 60 else (YELLOW if hp > 30 else RED)
    d.rounded_rectangle([258, 1308, 258 + (872 - 258) * hp / 100, 1352], radius=14, fill=col)
    paste(img, text_img(str(hp), 70, col, 8, BLACK, 0), 950, 1330)


def scene_question(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((20, 20, 80), (90, 20, 110)), (0, 0))
    glow(img, (255, 120, 200), 0.2 + 0.25 * beat_pulse(T))
    ocean_grid(ImageDraw.Draw(img), T, (110, 50, 150), 1560)
    a = appear(lt, c[0], 0.22)
    txt(img, "あなたなら", 110, W / 2, 330, WHITE, 10, alpha=a, scale=0.8 + 0.2 * ease_out_back(a))
    a = appear(lt, c[1], 0.22)
    if a > 0:
        wob = math.sin(T * 6) * 3
        txt(img, "何を守る？", 170, W / 2, 520, YELLOW, 14, scale=1.5 - 0.5 * ease_out_back(a), alpha=a, rot=wob,
            glow=(255, 150, 0))
    # 2x2の選択肢（1拍ごとにハイライトが回る）
    hi = int((T - sc["start"]) / BEAT) % 4
    for j, (e, lab, col) in enumerate(LEVEL_ROWS):
        a = appear(lt, 0.1 + j * 0.12, 0.3)
        if a <= 0:
            continue
        x = W / 2 + (-1 if j % 2 == 0 else 1) * 232
        y = 860 + (j // 2) * 270
        im = option_img(e, lab, col, j == hi and lt > c[1])
        paste(img, im, x, y, scale=ease_out_back(a) * (1.06 if j == hi and lt > c[1] else 1.0))
    a = appear(lt, c[2], 0.25)
    if a > 0:
        bob = math.sin(T * 9) * 14
        paste(img, emoji_img("👇", 90), W / 2 - 330, 1420 + bob, alpha=a)
        txt(img, "コメントで教えて！", 76, W / 2 + 50, 1420, WHITE, 9, alpha=a, scale=0.8 + 0.2 * ease_out_back(a))


@lru_cache(maxsize=16)
def option_img(e, lab, col, active):
    w, h = 440, 230
    im = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fill = col if active else tuple(int(v * 0.45) for v in col)
    d.rounded_rectangle([10, 10, w + 10, h + 10], radius=40, fill=fill + (255,),
                        outline=YELLOW + (255,) if active else (255, 255, 255, 200), width=10 if active else 5)
    em = emoji_img(e, 90)
    im.paste(em, ((w + 20 - em.width) // 2, 28), em)
    size = 64 if len(lab) <= 4 else 52
    t = text_img(lab, size, WHITE, 7, BLACK, 0)
    im.paste(t, ((w + 20 - t.width) // 2, 150 - t.height // 2 + 20), t)
    return im


def scene_logo(img, lt, sc, T):
    c = sc["cues"]
    img.paste(gradient((0, 10, 20), (0, 70, 90)), (0, 0))
    glow(img, (0, 200, 255), 0.35 + 0.15 * math.sin(T * 3))
    d = ImageDraw.Draw(img)
    ocean_grid(d, T * 0.5, (0, 110, 130), 1500)
    a = ease_out_back(lt / 0.35, 1.2)
    txt(img, "7", 560, W / 2, 700, YELLOW, 20, scale=0.2 + 0.8 * a, glow=(255, 140, 0), alpha=clamp(lt / 0.1))
    b = appear(lt, 0.12, 0.3)
    txt(img, "ISLAND", 200, W / 2, 330, WHITE, 14, scale=1.4 - 0.4 * ease_out_cubic(b), alpha=b, glow=(0, 200, 255))
    # 光のスイープ
    sx = -300 + (lt - 0.3) * 2600
    if -300 < sx < W + 300:
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).polygon([(sx, 150), (sx + 90, 150), (sx - 210, 1050), (sx - 300, 1050)], fill=90)
        img.paste(Image.new("RGB", (W, H), WHITE), (0, 0), m)
    a = appear(lt, c[1], 0.3)
    if a > 0:
        txt(img, "チームで、", 110, W / 2, 1140, WHITE, 10, alpha=a, scale=0.8 + 0.2 * ease_out_back(a))
        b = appear(lt, c[1] + 0.5, 0.25)
        txt(img, "生き延びろ。", 140, W / 2, 1300, YELLOW, 12, alpha=b, scale=1.4 - 0.4 * ease_out_back(b),
            glow=(255, 150, 0))
    a = appear(lt, c[1] + 1.2, 0.4)
    txt(img, "7日後、この島に最大級の嵐が来る。", 42, W / 2, 1480, (200, 240, 255), 5, alpha=a, shadow=0)


SCENE_FN = dict(hook=scene_hook, countdown=scene_countdown, actions=scene_actions, abilities=scene_abilities,
                typhoon=scene_typhoon, question=scene_question, logo=scene_logo)

# ---------------------------------------------------------------------------
# フレーム合成（ポストエフェクト込み）
# ---------------------------------------------------------------------------
TL: list = []
TOTAL = 0.0
HITS: list = []  # (time, strength, flash)


def beat_pulse(T):
    return math.exp(-((T % BEAT) / 0.11))


def setup_hits():
    S = {sc["key"]: sc for sc in TL}
    h = S["hook"]
    hits = [(0.0, 1.0, 0.9), (h["start"] + h["cues"][2] + 0.35, 1.0, 0.6)]
    for k in ("countdown", "actions", "abilities", "question"):
        hits.append((S[k]["start"], 0.4, 0.0))
    ty = S["typhoon"]
    hits += [(ty["start"], 1.2, 0.8), (ty["start"] + ty["cues"][1], 0.8, 0.4), (ty["start"] + ty["cues"][2], 1.3, 0.7)]
    lg = S["logo"]
    hits += [(lg["start"], 1.0, 1.0)]
    return hits


def fx_env(T):
    shake = flash = 0.0
    for th, s, f in HITS:
        if T >= th:
            dt = T - th
            shake += s * math.exp(-dt / 0.2)
            flash += f * math.exp(-dt / 0.07)
    return shake, flash


def caption(img, sc, lt):
    if not sc["captions"]:
        return
    idx = None
    for j, cue in enumerate(sc["cues"]):
        if lt >= cue - 0.03:
            idx = j
    if idx is None or lt > sc["ends"][idx] + 0.5:
        return
    a = appear(lt, sc["cues"][idx] - 0.03, 0.14)
    text = sc["texts"][idx]
    im = text_img(text, 74, WHITE, 9, BLACK, 5)
    paste(img, im, W / 2, 1640, scale=0.85 + 0.15 * ease_out_back(a))


def render_frame(i):
    T = i / FPS
    sc = section_at(TL, T)
    lt = T - sc["start"]
    img = Image.new("RGB", (W, H))
    SCENE_FN[sc["key"]](img, lt, sc, T)
    caption(img, sc, lt)

    shake, flash = fx_env(T)
    if sc["key"] == "typhoon" and lt > sc["cues"][2]:
        shake += 0.25
    zoom = 1 + 0.07 * min(shake, 1.5) + 0.012 * beat_pulse(T) * (sc["key"] not in ("hook",))
    if zoom > 1.001:
        cw, ch = W / zoom, H / zoom
        img = img.resize((W, H), Image.BILINEAR, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
    if shake > 0.05:
        r = random.Random(i * 7919)
        amp = 26 * min(shake, 1.5)
        dx, dy = int((r.random() - 0.5) * amp * 2), int((r.random() - 0.5) * amp * 2)
        img = ImageChops.offset(img, dx, dy)
        if shake > 0.5:  # 色収差グリッチ
            rch, gch, bch = img.split()
            o = int(10 * min(shake, 1.5))
            img = Image.merge("RGB", (ImageChops.offset(rch, o, 0), gch, ImageChops.offset(bch, -o, 0)))
    img.paste((0, 0, 0), (0, 0), vignette_mask())
    if flash > 0.02:
        img = Image.blend(img, Image.new("RGB", (W, H), WHITE), min(0.85, flash))
    return img.tobytes()


# ---------------------------------------------------------------------------


def main():
    global TL, TOTAL, HITS
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true", help="動画を書き出さずに確認用の静止画シートと音声だけ作る")
    ap.add_argument("--out", default=str(OUT_DIR / "island7_tiktok.mp4"))
    args = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("ナレーション合成中…", flush=True)
    TL, voices, TOTAL = build_timeline()
    HITS = setup_hits()
    for sc in TL:
        print(f"  {sc['key']:<10} {sc['start']:6.2f}s  +{sc['dur']:.2f}s  cues={[round(c, 2) for c in sc['cues']]}")
    print(f"  合計 {TOTAL:.2f}s")

    print("BGM・効果音をミックス中…", flush=True)
    wav_path = OUT_DIR / "island7_tiktok.wav"
    write_wav(wav_path, build_audio(TL, voices, TOTAL))

    nframes = int(TOTAL * FPS)
    if args.preview:
        picks = []
        for sc in TL:
            for c in sc["cues"]:
                picks.append(sc["start"] + c + 0.45)
        thumbs = [Image.frombytes("RGB", (W, H), render_frame(int(p * FPS))).resize((270, 480)) for p in picks]
        cols = 8
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * 270, rows * 480))
        for k, th in enumerate(thumbs):
            sheet.paste(th, ((k % cols) * 270, (k // cols) * 480))
        sheet.save(OUT_DIR / "preview_sheet.jpg", quality=85)
        print("preview_sheet.jpg を書き出しました")
        return

    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg, "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", str(wav_path),
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", args.out]
    print(f"映像レンダリング中…（{nframes}フレーム）", flush=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for k, fr in enumerate(pool.imap(render_frame, range(nframes), chunksize=6)):
            proc.stdin.write(fr)
            if k % 150 == 0:
                print(f"  {k}/{nframes}", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpegのエンコードに失敗しました")
    # カバー画像（1フレーム目＝フック）
    Image.frombytes("RGB", (W, H), render_frame(int(0.5 * FPS))).save(OUT_DIR / "cover.jpg", quality=90)
    print(f"完成: {args.out}")


if __name__ == "__main__":
    main()

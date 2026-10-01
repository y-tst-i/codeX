"""本物の楽器音源(無料の GM サウンドフォント)で MIDI を鳴らす道具。数式合成(audio_instruments.py)では出ない「楽器の質感」を足す。

導入(無料・全部オープンソース):
    apt-get update && apt-get install -y fluidsynth fluid-soundfont-gm     # 音源は /usr/share/sounds/sf2/FluidR3_GM.sf2 (MITライセンス系)
    pip install pretty_midi mido

使い方(Python):
    import pretty_midi as pm, midi_render as M
    m = pm.PrettyMIDI(initial_tempo=120)
    ins = pm.Instrument(program=46)                      # 46=ハープ。番号は下の GM 早見表
    ins.notes.append(pm.Note(velocity=90, pitch=67, start=0.0, end=1.0)); m.instruments.append(ins)
    drums = pm.Instrument(program=0, is_drum=True)       # ドラムは is_drum=True。pitch 36=キック 38=スネア 42=ハット 49=クラッシュ
    x = M.render(m, tail=2.0)                            # -> (n,2) float。ここで場面ごとの加工をかける
    x = M.scene_fx(x, rev=1.8, lp_hz=6000, hp_hz=120, wet=0.3)
    # x を時刻 t に置く: L,R に加算(audio_instruments.py の mix と同様)

GM 早見表(program 番号。0始まり):
  鍵盤  0 ピアノ / 4 エレピ / 5 エレピ2 / 8 チェレスタ / 9 グロッケン / 11 ビブラフォン / 12 マリンバ / 14 チューブラーベル / 19 パイプオルガン
  弦    24 ナイロンギター / 26 ジャズギター / 28 ミュートギター / 32 アコベース / 35 フレットレス / 38 シンセベース / 40 バイオリン / 42 チェロ / 44 トレモロ弦 / 45 ピチカート / 46 ハープ / 47 ティンパニ / 48 弦アンサンブル
  管・声 52 合唱ああ / 53 声うう / 55 オーケストラヒット / 56 トランペット / 57 トロンボーン / 60 ホルン / 61 ブラス / 68 オーボエ / 71 クラリネット / 73 フルート / 75 パンフルート / 77 尺八
  シンセ 80 矩形リード / 81 のこぎりリード / 88 ファンタジア / 89 ウォームパッド / 90 ポリシンセ / 91 合唱パッド / 94 ハローパッド
  民族  105 バンジョー / 107 琴 / 108 カリンバ / 116 太鼓(タイコ) / 117 メロディックタム
  効果  119 リバースシンバル / 120 ギターフレットノイズ / 121 ブレスノイズ / 122 海辺 / 123 鳥のさえずり / 124 電話 / 125 ヘリ / 126 拍手
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SF2 = os.environ.get("SF2", "/usr/share/sounds/sf2/FluidR3_GM.sf2")
SR = 44100


def render(pm_obj, tail=1.5, sr=SR, sf2=SF2, gain=0.8):
    """pretty_midi.PrettyMIDI -> (n,2) float32。fluidsynth 内蔵の残響とコーラスは切る(残響は scene_fx で場面ごとにかける)。"""
    with tempfile.TemporaryDirectory() as d:
        mid, wav = os.path.join(d, "a.mid"), os.path.join(d, "a.wav")
        pm_obj.write(mid)
        subprocess.run(["fluidsynth", "-ni", "-r", str(sr), "-g", str(gain), "-R", "0", "-C", "0", "-F", wav, sf2, mid],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        s, x = wavfile.read(wav)
    x = x.astype(np.float32) / 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    n = int((pm_obj.get_end_time() + tail) * sr)
    return x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))


def make_ir(sec, sr=SR, seed=3, damp_hz=7000, pre=0.01):
    """簡易インパルス応答。sec=残響の長さ、damp_hz=高域の減衰(小さいほど暗い空間)。"""
    r = np.random.default_rng(seed)
    n = int(sec * sr)
    t = np.arange(n) / sr
    ir = r.standard_normal((n, 2)) * np.exp(-t / (sec / 5.5))[:, None]
    sos = butter(2, damp_hz, fs=sr, output="sos")
    ir = sosfilt(sos, ir, axis=0)
    ir = np.pad(ir, ((int(pre * sr), 0), (0, 0)))
    return ir / (np.abs(ir).sum(0).max() ** 0.5 + 1e-9) * 0.35


def scene_fx(x, rev=1.5, wet=0.25, lp_hz=None, hp_hz=None, damp_hz=7000, sr=SR, seed=3):
    """場面ごとの加工: 帯域(lp/hp) と 残響(長さ・暗さ・量)。場面で数値を変えるのが「質感を変える」本体。"""
    if hp_hz:
        x = sosfilt(butter(2, hp_hz, "hp", fs=sr, output="sos"), x, axis=0)
    if lp_hz:
        x = sosfilt(butter(2, lp_hz, "lp", fs=sr, output="sos"), x, axis=0)
    if rev and wet:
        ir = make_ir(rev, sr, seed, damp_hz)
        w = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)[: len(x) + len(ir)]
        x = np.pad(x, ((0, len(w) - len(x)), (0, 0))) * (1 - wet * 0.5) + w * wet
    return x.astype(np.float32)


def fade_out(x, sec, sr=SR):
    k = min(len(x), int(sec * sr))
    if k:
        x = x.copy(); x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


def place(L, R, x, t, gain=1.0, sr=SR):
    """ステレオ配列 L,R の時刻 t に x を加算。"""
    i = int(round(t * sr)); n = min(len(x), len(L) - i)
    if n > 0:
        L[i:i + n] += x[:n, 0] * gain; R[i:i + n] += x[:n, 1] * gain

"""効果音を「音楽の下地(ベッド)に対する大きさ」と「映像の合図に対する位置」で置くミキサー。B と C で共有。
- 位置: 音の同期点(onset = 立ち上がり / peak = 一番大きい所)を「絵の時刻 + offset_ms」に置く
- 大きさ: earshot の bed モデル(kit.bed_level / kit.loud_lufs / kit.over_bed)で、効果音の最も大きい 50 ms が
  直前 1 秒の音楽の中央値より bed_db だけ上になるように(音楽が止まっている所は NOMINAL_BED を使う)
- 空間: 場面ごとに音楽と同じ系統の部屋へ少しだけ送る(効果音だけ浮かないように)
出どころ(src)は "kit"(earshot のキット = B)/ "earshot"(バンクから直接)/ "kenney"(録音系 CC0)。
"""
import json
import os

import numpy as np
import soundfile as sf

import common as C
import earshot_cache
from earshot.forge import kit as K

# 場面ごとの効果音の部屋(score.py の音楽の部屋と同じ系統)
ROOMS = [(0.0, 3.75, dict(rt=0.7, pre=0.008, bright=5000, seed=31), 0.10),
         (3.75, 6.9, dict(rt=0.6, pre=0.004, bright=8000, seed=32), 0.08),
         (6.9, 10.0, dict(rt=1.4, pre=0.015, bright=6000, seed=33), 0.12),
         (10.0, 11.9, dict(rt=1.1, pre=0.012, bright=7000, seed=34), 0.10),
         (11.9, 15.0, dict(rt=2.4, pre=0.02, bright=4500, seed=35), 0.14)]


def room_for(t):
    for a, b, kw, wet in ROOMS:
        if a <= t < b:
            return kw, wet
    return ROOMS[-1][2], ROOMS[-1][3]


PEAK_CAP = 12.0     # 効果音の頂点は下地(直前 1 秒の音楽の中央値、LUFS)+ 12 dB まで


class Mixer:
    def __init__(self, music, nominal_bed=None, room=None, out_ceiling_db=-4.0, target_lufs=-14.0):
        self.music = music
        # 仕上げ後の効果音の頂点の上限(dBFS)を、仕上げ前の値に直す: 仕上げのゲインは音楽(+部屋)の大きさでほぼ決まる
        mus = music + (room if room is not None else 0)
        self.est_gain = target_lufs - C.ebur(mus)[0] - 0.7
        self.abs_cap = out_ceiling_db - self.est_gain
        self.bus = C.zeros()
        self.log = []
        levels = [K.bed_level(music, t, C.SR) for t in np.arange(1.0, C.DUR, 0.5)]
        levels = [v for v in levels if v is not None]
        # 音楽が止まっている所(タイトル前の一拍など)の基準: 曲の典型的な下地の 6 dB 下
        self.nominal_bed = nominal_bed if nominal_bed is not None else float(np.median(levels)) - 6.0

    def bed(self, t):
        b = K.bed_level(self.music, t, C.SR)
        # 音楽を止めた窓(タイトル前の一拍など)では、止める前の下地を基準にする(earshot の bed_level は None か、ごく小さい値になる)
        return (b, False) if (b is not None and b >= self.nominal_bed) else (self.nominal_bed, True)

    def put(self, ev, y, sync_s, l50=None, peak_db=None):
        """y: (n,2) 48 kHz の素材、sync_s: 素材の中の同期点(秒)。ev: 合図の記述(dict)"""
        y = np.asarray(y, np.float64)
        if y.ndim == 1:
            y = np.stack([y, y], 1)
        if ev.get("hp"): y = C.hp(y, ev["hp"])
        if ev.get("lp"): y = C.lp(y, ev["lp"])
        if ev.get("peq"): y = C.peq(y, *ev["peq"])
        y = C.fades(y, 0.0005, 0.01)
        t_pic = ev["t"]
        bed, nominal = self.bed(t_pic)
        l50 = K.loud_lufs(y, C.SR)
        pk = 20 * np.log10(np.abs(y).max() + 1e-12)
        trim = ev.get("trim_db", 0.0)
        g = bed + K.over_bed(ev["bed_db"]) - l50 + max(trim, 0.0)
        # 頂点の上限: 素材の頂点を下地(LUFS)+ PEAK_CAP dB までに抑える。K 特性は低域を軽く数えるので、低い「トン」は
        # bed_db どおりだと頂点が大きくなりすぎ、仕上げのリミッターが潰す(B の初回で最大 6 dB)。数値で確かめた対策
        cap = min(bed + ev.get("peak_cap_db", PEAK_CAP), self.abs_cap) - pk
        capped = g > cap
        g = min(g, cap, -1.0 - pk) + min(trim, 0.0)      # 下げる微調整は上限の後にかける(上限に当たっていても効く)
        y = y * C.db(g)
        if ev.get("pan"):
            y = _pan(y, ev["pan"])
        kw, wet = room_for(t_pic)
        wet = ev.get("send", wet)
        if wet > 0:
            y = C.reverb(y, wet, **kw)
        start = t_pic + ev.get("offset_ms", 0) / 1000.0 - sync_s
        C.add(self.bus, y, start)
        fr = ev.get("pic_frame", C.CUES.get(ev["cue"]))      # 狙った絵のコマ(派生の合図は make_*.py で明示)
        frame_info = {} if fr is None else {"pic_frame": fr, "pic_frame_s": round(fr / C.FPS, 4),
                                             "aim_minus_frame_ms": round((t_pic - fr / C.FPS) * 1000, 1),
                                             "sync_minus_frame_ms": round((start + sync_s - fr / C.FPS) * 1000, 1)}
        self.log.append({k: ev[k] for k in ev if k not in ("y",)} | {
            "start_s": round(start, 4), "sync_at_s": round(start + sync_s, 4), "gain_db": round(float(g), 2),
            "bed_lufs": round(float(bed), 2), "bed_nominal": nominal, "peak_capped": bool(capped), **frame_info, "l50_take_lufs": round(float(l50), 2)})

    # ---- 出どころ別の読み込み
    def from_kit(self, ev, lock, kit_dir):
        role = lock["roles"][ev["role"]]
        takes = role["takes"]
        if "pitch" in ev:
            tk = next(t for t in takes if t["pitch"] == ev["pitch"])
        else:
            tk = takes[ev.get("take", 0) % len(takes)]
        y, sr = sf.read(os.path.join(kit_dir, tk["file"]), dtype="float64", always_2d=True)
        ev = dict(ev, sound=role["sound"], file=tk["file"], align=role["align"],
                  offset_ms=ev.get("offset_ms", role.get("offset_ms", 0)), bed_db=ev.get("bed_db", role.get("bed_db", 6)))
        self.put(ev, y, tk[f'{role["align"]}_s'])

    def from_earshot(self, ev):
        y, meta = earshot_cache.take(ev["id"], seed=ev.get("seed"), dur=ev.get("dur"), apex=ev.get("apex"), pitch=ev.get("pitch"))
        sync = meta["peak_s"] if ev.get("align") == "peak" else meta["onset_s"]
        self.put(dict(ev, sound=ev["id"], checks=[w.get("code") for w in (meta.get("checks") or {}).get("warnings", [])]), y, sync)

    def from_kenney(self, ev):
        y = C.load_kenney(ev["id"])
        if ev.get("rate"):                       # 再生速度(音程と長さが一緒に変わる)
            from scipy.signal import resample
            y = resample(y, int(len(y) / ev["rate"]), axis=0)
        if ev.get("align") == "peak":
            sync = C.peak_index(y) / C.SR
        else:
            m = np.abs(y).max(1); sync = float(np.argmax(m > m.max() * 0.0316)) / C.SR   # -30 dB の立ち上がり
        self.put(dict(ev, sound=ev["id"]), y, sync)


def _pan(y, p):
    gl, gr = np.cos((p + 1) * np.pi / 4) * np.sqrt(2), np.sin((p + 1) * np.pi / 4) * np.sqrt(2)
    return y * np.array([min(1.0, gl), min(1.0, gr)])


def finish(name, music, room, sfx_bus, log, extra_info=None):
    """music(仕上げ前)+ room + 効果音 → master。WORK/<name>/ に mix・ステム・合図の記録を書く"""
    out = os.path.join(C.WORK, name)
    os.makedirs(out, exist_ok=True)
    # 音楽バスの頂点を、仕上げのゲインを掛けた後で -1 dBFS 以下に(v1 は音楽ステムだけで 0 dBFS を超える所があった)
    g0 = C.db(-14.0 - C.ebur(music + room + sfx_bus)[0])
    music, mus_red, _ = C.limiter(music, 20 * np.log10(C.db(-1.5) / g0))
    mix = music + room + sfx_bus
    y, info = C.master(mix)
    g = C.db(info["gain_db"])
    pre = (mix - mix.mean(0)) * g
    info["music_bus_limiter_db"] = round(mus_red, 2)
    info["music_bus_peak_dbfs_after_gain"] = round(float(20 * np.log10(np.abs((music + room) * g).max())), 2)
    info["mix_peak_before_final_limiter_dbfs"] = round(float(20 * np.log10(np.abs(pre).max())), 2)
    C.write(os.path.join(out, "mix.wav"), y)
    C.write(os.path.join(out, "stem_music.wav"), (music + room) * g, "FLOAT")
    C.write(os.path.join(out, "stem_sfx.wav"), sfx_bus * g, "FLOAT")
    info.update(extra_info or {})
    json.dump(info, open(os.path.join(out, "master.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(log, open(os.path.join(out, "events.json"), "w"), ensure_ascii=False, indent=1, default=str)
    print(f"{name}: {info['lufs']:.1f} LUFS, TP {info['tp']:.1f} dBTP, LRA {info['lra']:.1f}, limiter {info['limiter_max_db']:.1f} dB at {info['limiter_hits']}")
    return y, info

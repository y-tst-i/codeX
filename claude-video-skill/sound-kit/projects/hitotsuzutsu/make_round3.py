#!/usr/bin/env python3
"""第3ラウンド(条件 D): PC の Audio Studio で作った BGM(D1–D4、docs/sound-upgrade/audio_studio_pc/)と S9(第2ラウンドの light の BGM)を、
**5 本とも同じ規則で** C の効果音の下に置く。BGM の編曲・中身は変えない(下げる処理と、BGM だけのリミッターだけ)。
- 読み込み: D は 44.1 kHz → 48 kHz(audit_round3.load_d)。S9 は score2 から低域の下げを入れずに作り直した物(WORK/R3_S9_source.wav、audit_round3.py が書く)
- 大きさ: BGM だけを統合 -14.0 LUFS にそろえ、(終わりのフェードと)低域の下げの後、「BGM + C の音程の身振り」を C の音楽バス(仕上げ前)に合わせる
- 低い効果音の瞬間: make_round2.DUCKS で 200 Hz 未満だけを一瞬下げる(5 本同じ)
- 中域: 効果音の頂点の 30 ms で効果音が音楽より MARGIN dB 上になるよう、足りない分だけ BGM のその帯域を一瞬下げる
  (下げる前の BGM に対して 1 回だけ。間が 3 × RAMP 未満の窓は 1 つにまとめる。帯域の上限 DIP_HI_CAP。上限 -6 dB、50 ms の raised cosine)
- BGM だけのリミッター: 仕上げのゲインの後で BGM の頂点が BGM_CEIL 以下になるように。音楽バス(BGM + 身振り)のリミッターは使わない
  (前の版は音楽バスのリミッターが身振りを条件ごとに 0〜1.7 dB 違う量で削っていた)
- 効果音の頂点を守る下げ: 効果音の合図の窓(同期点 -30 ms〜+100 ms)で、仕上げのゲインの後のミックスの頂点(4 倍オーバーサンプル)が
  PEAK_TARGET(効果音・身振り・部屋だけで超える窓は、その頂点 + PEAK_OVER_REST)を超える所だけ、BGM を全帯域で浅く下げる
  (必要な分だけ、上限 -6 dB、50 ms の raised cosine。間が MERGE_GAP 未満の隣は浅い方の深さでつなぐ)。全帯域で足りない所は、
  さらに 40–250 Hz だけを下げる(上限 -6 dB、同じ立ち上がり・戻り)。その結果 BGM ベッドが深くなりすぎる所は近くの下げを浅くする(keep_bed。
  優先の順: ルール 4 の 100 ms > 効果音の頂点 > 参考の 50 ms)。仕上げのリミッターが効果音の頂点を潰す量を 5 本でそろえるため。
  窓は効果音の同期点と、C の音程の身振りの発音の時刻(protect_times)。中域の谷・低域の一瞬の下げとは別の処理なので、重なると合計は -6 dB より深くなる
- 終わり方: 記録で決める(ending_decision)。作曲した終わり方の S9 はそのまま、生成 BGM で作曲上の終わりでない物は END_FADE のフェード
- 仕上げ: mixer.finish(music_bus_limiter=False → -14 LUFS / -2 dBTP)
usage: python make_round3.py [S9 D1 D2 ...]   前提: make_C.py・audit_round3.py を実行済み
出力: WORK/R3_S9/、WORK/R3_D1/ … (mix.wav・stem_*.wav・raw_bgm_only.wav(低域の下げ・谷の前、フェード後)・raw_bgm_in_mix.wav・band_dips.json・peak_dips.json・master.json)
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audit_round3 as A  # noqa: E402
import common as C  # noqa: E402
import qa  # noqa: E402
from make_round2 import CAP, DUCKS, MARGIN, NO_DIP, RAMP, rd  # noqa: E402  S9 と同じ値
from mixer import finish  # noqa: E402

PLANS = ["S9"] + A.PLANS
END_FADE = (14.0, 1.0)      # 作曲上の終わりでない BGM だけ: 14.0 s から 1.0 s(終わりの静止 13.6 s の後。タイトル着地 12.57 s には掛からない)
DIP_HI_CAP = 4500.0         # 中域の谷の帯域の上限(Hz)。前の版は 16 kHz まで広がる窓があった
BGM_CEIL = -3.0             # 仕上げのゲインの後の BGM だけの頂点(dBFS)。音楽バスのリミッターは使わない(身振りを削らない)
PEAK_TARGET = -2.5          # 合図の窓のミックスの頂点(仕上げのゲインの後、4 倍オーバーサンプル、dBFS)。仕上げのリミッターの天井は -2.0
PEAK_OVER_REST = 0.5        # 効果音・身振り・部屋だけで PEAK_TARGET を超える窓は、BGM が頂点を足す量を 0.5 dB までにする(5 本で同じ潰れ方に)
PEAK_STEP = 0.25
LOG = os.path.join(C.REPO, "docs", "sound-upgrade", "audio_studio_pc", "generation_log.json")


def relative(k):
    """平行調の名前(Eb major ↔ C minor)"""
    n, q = k.split()
    i = A.BM.NOTES.index(n)
    return f"{A.BM.NOTES[(i - 3) % 12]} minor" if q == "major" else f"{A.BM.NOTES[(i + 3) % 12]} major"


def ending_decision(plan, a, log):
    """終わり方の判定を記録で決める。戻り値 (作曲上の終わりか, 理由の一覧, 注)"""
    if plan == "S9":
        return True, ["作曲した終わり方(score2: タイトルの Eb の和音を伸ばして減衰させる楽譜)"], None
    rec = log[plan]
    e, key = a["ending"], a["key"]["key"]
    key_ok = e["key_last2s"] in (key, relative(key))         # 平行調は同じ扱い
    reasons, note = [], None
    if rec.get("trimmed_to_seconds"):
        reasons.append(f"{rec['seconds_generated']} s で生成して最初の {rec['trimmed_to_seconds']} s に切った物(PC の記録: {rec['trim']})。作曲上の終わりではない")
        if key_ok and e["last_100ms_db_vs_median"] <= -9.0:
            note = (f"際どい: 最後の 2 s の調({e['key_last2s']})は全体の調({key})と同じか平行調で、最後の 100 ms も {e['last_100ms_db_vs_median']} dB 下がる。"
                    "ただし下がり方には PC の 0.2 s のフェードが入っていて、切った位置で終わっている")
    elif e["last_100ms_db_vs_median"] > -9.0:
        reasons.append(f"{rec.get('seconds', 15)} s で生成。最後まで減衰しない(最後の 100 ms が中央値から {e['last_100ms_db_vs_median']} dB)")
    if not key_ok:
        reasons.append(f"最後の 2 s の調({e['key_last2s']})が全体の調({key})とも、その平行調とも違う")
    return not reasons, reasons, note


def end_fade(x, start, length):
    t = np.arange(len(x)) / C.SR
    u = np.clip((t - start) / length, 0, 1)
    return x * (0.5 + 0.5 * np.cos(np.pi * u))[:, None]


MERGE_GAP = 3 * RAMP        # 間がこれ未満の隣の窓は 1 つにまとめる / つなぐ。2 × RAMP(0.10 s)だと、間が 0.101 s の窓(戻りと下げ始めが接して一瞬 0 dB)を拾えなかった


def merge(items, gap=MERGE_GAP):
    """時刻順の窓 [t0, t1, ...] のうち、間が gap 未満の物を 1 つにまとめる(間で一瞬 0 dB に戻らないように)"""
    out = []
    for it in sorted(items, key=lambda v: v[0]):
        if out and it[0] - out[-1][1] < gap:
            out[-1] = [out[-1][0], max(out[-1][1], it[1])] + [f(p, q) for f, p, q in zip((min, max, min), out[-1][2:], it[2:])]
        else:
            out.append(list(it))
    return out


def plan_dips(events, bgm, gest, sfx):
    """中域の谷: 下げる前の BGM に対して 1 回だけ。間が MERGE_GAP 未満の窓はまとめる(帯域は広げ、深さは深い方)。帯域の上限 DIP_HI_CAP"""
    ev = qa.overlap(events, bgm + gest, sfx)
    items, skipped = [], []
    for e in sorted(ev, key=lambda e: e["measured_peak_s"]):
        need = e["sfx_over_music_30ms_db"] - MARGIN
        if need >= 0 or e["cue"] in NO_DIP:
            continue
        lo, hi = min(e["bands_hz"]) / 1.26, min(max(e["bands_hz"]) * 1.26, DIP_HI_CAP)
        if hi <= lo * 1.26:
            skipped.append(e["cue"]); continue
        items.append([e["measured_peak_s"] - 0.03, e["measured_peak_s"] + 0.12, lo, hi, max(CAP, need)])
    dips = merge(items)
    return [[d[0], d[1], d[2], d[3], max(CAP, d[4])] for d in dips], skipped


def _os_peak_db(x):
    return 20 * np.log10(np.abs(resample_poly(x, 4, 1, axis=0)).max() + 1e-12)


def protect_times(events):
    """頂点を守る窓の時刻: 効果音の同期点と、C の音程の身振りの発音(効果音の無い棒の合図など。make_C.music_gestures と同じ時刻)"""
    F1, d = 1 / 30, 0.035
    names = ["step_check_1", "step_check_2", "step_check_3", "bar_1", "bar_2", "bar_3", "bar_4", "bar_5", "bar_6", "bar_today", "icon_pop", "main_check"]
    gt = [C.T(n) + F1 / 1000 + d for n in names] + [C.T("icon_pop") + F1 / 1000 + d + 0.11]
    out = []
    for t in sorted([e["sync_at_s"] for e in events] + gt):
        if not out or t - out[-1] > 0.02:                   # 20 ms 以内の時刻は 1 つに(段のチェックの効果音と身振りは 1.7 ms 違い)
            out.append(round(t, 4))
    return out


LOW_BAND = (40.0, 250.0)    # 全帯域の下げで足りない時に、さらに下げる低域(BGM の低音と効果音の頂点が同じ向きに重なる所)


def _low(x):
    from scipy.signal import butter, sosfiltfilt
    return sosfiltfilt(butter(2, list(LOW_BAND), "bandpass", fs=C.SR, output="sos"), x, axis=0)


def peak_dips(bgm, rest, events, G):
    """合図の窓で (BGM × h + 残り) × G の頂点が max(PEAK_TARGET, 残りだけの頂点 + PEAK_OVER_REST) 以下になる下げを求める。
    まず全帯域 h(上限 CAP)、それで足りなければ低域 LOW_BAND をさらに hl(上限 CAP)。戻り値 (全帯域の窓, 低域の窓)"""
    full, low = [], []
    for t in protect_times(events):
        a, b = int((t - 0.03) * C.SR), int((t + 0.10) * C.SR)
        pa, pb = max(0, a - int(0.3 * C.SR)), b + int(0.3 * C.SR)
        lowseg = _low(bgm[pa:pb])[a - pa: a - pa + (b - a)] * G
        sb, sr_ = bgm[a:b] * G, rest[a:b] * G
        allowed = max(PEAK_TARGET, _os_peak_db(sr_) + PEAK_OVER_REST)
        pk = lambda h, hl: _os_peak_db((sb + lowseg * (C.db(hl) - 1)) * C.db(h) + sr_)
        if pk(0, 0) <= allowed:
            continue
        d = 0.0
        while d > CAP and pk(d, 0) > allowed:
            d -= PEAK_STEP
        dl = 0.0
        while dl > CAP and pk(d, dl) > allowed:
            dl -= PEAK_STEP
        full.append([t - 0.03, t + 0.10, round(d, 2)])
        if dl < 0:
            low.append([t - 0.03, t + 0.10, LOW_BAND[0], LOW_BAND[1], round(dl, 2)])
    return bridge(full), low


def bridge(items, gap=MERGE_GAP):
    """間が gap 未満の隣の窓の間を、浅い方の深さでつなぐ(間で 0 dB に戻らない。深い方の深さを長く延ばさない)"""
    items = sorted(items)
    out = list(items)
    for p, q in zip(items, items[1:]):
        if 0 < q[0] - p[1] < gap:
            out.append([p[1], q[0], max(p[2], q[2])])
    return sorted(out)


BED_LIMIT = -14.5           # 頂点を守る下げで、BGM ベッド(100 ms・50 ms)の落ち込みがこれ(または下げる前の値 - 0.5 dB)より深くなる時は、近くの下げを浅くする(ルール 4 を優先)


BED50_SLACK = 3.0          # 50 ms のベッド(参考)が下げる前から -15 dB を外れている BGM だけ、さらに 3.0 dB まで深くなってよい(効果音の頂点を守る方を優先)


def keep_bed(m, pks, lows):
    """頂点を守る下げの後のベッド(100 ms と 50 ms、10 ms ずらし)の落ち込みが、min(BED_LIMIT, 下げる前の値 - 0.5 / BED50_SLACK) より深い間、
    最も深い所の ±0.15 s にかかる下げを 0.5 dB ずつ浅くする(頂点を守る下げが、BGM の谷を新しく作らないように)"""
    b0 = A.BM.bed_stats(m)
    lim = {"rms100": min(BED_LIMIT, b0["rms100_min_below_median_db"] - 0.5),                 # ルール 4(100 ms)
           # 参考の 50 ms: 下げる前に -15 dB 以内の BGM は外さない。元から外れている BGM(元のファイルに谷がある)だけ BED50_SLACK まで緩める
           "rms50": (min(BED_LIMIT, b0["rms50_min_below_median_db"] - 0.5) if b0["rms50_min_below_median_db"] >= -15.0
                     else b0["rms50_min_below_median_db"] - BED50_SLACK)}
    fixes = []
    for _ in range(80):
        y = C.band_dip(m, lows, ramp=RAMP) * gain_env(pks)[:, None]
        b = A.BM.bed_stats(y)
        bad = [k for k in ("rms100", "rms50") if b[f"{k}_min_below_median_db"] < lim[k]]
        if not bad:
            break
        t = b[f"{bad[0]}_min_at_s"]
        hit = lambda a_, b_: a_ - RAMP - 0.15 <= t <= b_ + RAMP + 0.15
        changed = False
        for it in pks:
            if hit(it[0], it[1]) and it[2] < 0:
                it[2] = min(0.0, it[2] + 0.5); changed = True
        for it in lows:
            if hit(it[0], it[1]) and it[4] < 0:
                it[4] = min(0.0, it[4] + 0.5); changed = True
        fixes.append([bad[0], t, b[f"{bad[0]}_min_below_median_db"]])
        if not changed:
            break
    return [p for p in pks if p[2] < 0], [p for p in lows if p[4] < 0], {"limits": lim, "steps": fixes}


def gain_env(items, n=C.N, ramp=RAMP):
    """[t0, t1, 深さ dB] の窓から全帯域のゲインの包絡(raised cosine の立ち上がり・戻り、重なりは深い方)"""
    t = np.arange(n) / C.SR
    gdb = np.zeros(n)
    for t0, t1, d in items:
        w = np.clip(np.minimum((t - (t0 - ramp)) / ramp, ((t1 + ramp) - t) / ramp), 0, 1)
        gdb = np.minimum(gdb, d * (0.5 - 0.5 * np.cos(np.pi * w)))
    return C.db(gdb)


def main(plans=tuple(PLANS)):
    sfx, gest, room, cmus = rd("raw_sfx.wav"), rd("raw_gestures.wav"), rd("raw_room.wav"), rd("raw_music.wav")
    events = json.load(open(os.path.join(C.WORK, "C", "events.json")))
    audit = json.load(open(os.path.join(C.WORK, "R3_audit.json")))
    log = {r["id"]: r for r in json.load(open(LOG, encoding="utf-8-sig"))}
    L_c = C.ebur(cmus)[0]
    for plan in plans:
        out = os.path.join(C.WORK, f"R3_{plan}")
        os.makedirs(out, exist_ok=True)
        if plan == "S9":
            x, _ = sf.read(A.S9_SOURCE, dtype="float64", always_2d=True); x = x[: C.N]
            src = {"file": "WORK/R3_S9_source.wav", "note": "score2 light、低域の下げの前"}
        else:
            x, src = A.load_d(plan)
        I0 = C.ebur(x)[0]
        g14 = -14.0 - I0
        bgm = x * C.db(g14)                                   # BGM だけで -14 LUFS
        ok, reasons, note = ending_decision(plan, audit[plan], log)
        fade = None if ok else {"start_s": END_FADE[0], "length_s": END_FADE[1], "shape": "raised cosine to silence at 15.0 s"}
        if fade:
            bgm = end_fade(bgm, *END_FADE)
        ducked = C.low_duck(bgm, list(DUCKS), f=200.0)        # 低域の一瞬の下げ(5 本同じ)
        g = C.db(L_c - C.ebur(ducked + gest)[0])              # 効果音との釣り合いを C と同じに
        bgm_only, ducked = bgm * g, ducked * g                # BGM だけの音声は低域の下げ・谷の前から
        dips, skipped = plan_dips(events, ducked, gest, sfx)
        m = C.band_dip(ducked, dips, ramp=RAMP)
        G = C.db(-14.0 - C.ebur(m + gest + room + sfx)[0])
        m, bgm_lim, _ = C.limiter(m, BGM_CEIL - 20 * np.log10(G))
        pks, lows = [], []
        for _ in range(3):                                    # 深さは下げる前の BGM に対して求める。仕上げのゲインが少し変わるので 3 回まで詰める
            cur = C.band_dip(m, lows, ramp=RAMP) * gain_env(pks)[:, None]
            G = C.db(-14.0 - C.ebur(cur + gest + room + sfx)[0])
            new, newl = peak_dips(m, gest + room + sfx, events, G)
            if new == pks and newl == lows:
                break
            pks, lows = new, newl
        pks, lows, bed_fix = keep_bed(m, pks, lows)
        m = C.band_dip(m, lows, ramp=RAMP) * gain_env(pks)[:, None]
        C.write(os.path.join(out, "raw_bgm_only.wav"), bgm_only, "FLOAT")
        C.write(os.path.join(out, "raw_bgm_in_mix.wav"), m, "FLOAT")
        json.dump([[round(v, 3) for v in d] for d in dips], open(os.path.join(out, "band_dips.json"), "w"))
        json.dump({"full_band": [[round(v, 3) for v in d] for d in pks], "low_band": [[round(v, 3) for v in d] for d in lows]},
                  open(os.path.join(out, "peak_dips.json"), "w"))
        info = {"plan": plan, "source": src, "source_lufs": I0, "gain_to_-14_lufs_db": round(g14, 2),
                "bgm_gain_to_match_C_db": round(20 * np.log10(g), 2), "C_music_lufs_premaster": L_c,
                "ending_composed": ok, "ending_reasons": reasons, "ending_note": note, "end_fade": fade,
                "ending_measure": {"key": audit[plan]["key"]["key"], "key_last2s": audit[plan]["ending"]["key_last2s"],
                                   "last_100ms_db_vs_median": audit[plan]["ending"]["last_100ms_db_vs_median"]},
                "low_ducks": DUCKS, "dip_rule": {"margin_db": MARGIN, "cap_db": CAP, "ramp_s": RAMP, "merge_gap_s": MERGE_GAP,
                                                  "hi_cap_hz": DIP_HI_CAP, "no_dip": sorted(NO_DIP), "skipped": skipped},
                "bgm_limiter": {"ceiling_dbfs_after_master_gain": BGM_CEIL, "max_db": round(bgm_lim, 2)},
                "peak_dips_bed_fix": {"limits_db": bed_fix["limits"], "steps": len(bed_fix["steps"]), "first": bed_fix["steps"][:3]},
                "peak_dips": {"target_dbfs": PEAK_TARGET, "over_rest_db": PEAK_OVER_REST, "count": len([p for p in pks if p[1] - p[0] > 0.11]), "bridges": len([p for p in pks if p[1] - p[0] <= 0.11]),
                              "deepest_db": min([p[2] for p in pks], default=0.0),
                              "low_band": {"hz": LOW_BAND, "count": len(lows), "deepest_db": min([p[4] for p in lows], default=0.0)}}}
        finish(f"R3_{plan}", m + gest, room, sfx, events, info, music_bus_limiter=False)
        print(plan, "dips", len(dips), "peak dips", pks, "low", lows, "bgm limiter", round(bgm_lim, 2), "fade", bool(fade), reasons, note)


if __name__ == "__main__":
    main(tuple(sys.argv[1:]) or tuple(PLANS))

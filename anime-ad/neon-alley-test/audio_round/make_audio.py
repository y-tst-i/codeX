"""NEON ALLEY 15s — our own sound kit re-score (music=GM MIDI, sfx=CC0 recordings, ambience=synth).
Seed fixed. Writes neon_alley_ours.wav (raw mix, pre-loudness) + stems stats + cues.json.
Cue times come from C/engine/src/timeline.js (90 BPM, beat=0.6667s) and a contact sheet of the picture."""
import sys, json, os
import numpy as np
import pretty_midi as pm
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt

KIT = "/home/user/codeX/claude-video-skill/tools"
sys.path.insert(0, KIT)
import midi_render as M
import sfx_lib

OUT = os.path.dirname(os.path.abspath(__file__))
SR = 44100
DUR = 15.0
N = int(DUR * SR)
BEAT = 60 / 90
B = lambda k: k * BEAT
rng = np.random.default_rng(1234)

C = dict(s1=0, signsOn=B(.25), eyes=B(2), crouch=B(4) - .2, go=B(4.5), bolt1=B(4.6),
         s2=B(5), s2b=B(8), weave=B(9), s3=B(11), jump=B(11.85), slowIn=B(12.6), slowOut=B(13.8),
         bolt2=B(14), whiteIn=B(14.9), s4=B(15), land=B(15.4), titleOn=B(15.75), sub=B(18),
         blink=B(18.8), freeze=B(19.8), end=15.0)
SCENES = [("S1 BOOT", 0, C["s2"]), ("S2 DASH", C["s2"], C["s3"]), ("S3 LEAP", C["s3"], C["s4"]), ("S4 TITLE", C["s4"], DUR)]
QUIET = [(C["slowIn"], C["slowOut"]), (C["freeze"] + .15, 14.1)]  # near-silence windows (bed lowered, not zero)

stems = {k: np.zeros((N, 2), np.float32) for k in ("bed", "music", "amb", "sfx", "synth_sfx")}


def put(stem, x, t, g=1.0, pan=0.0):
    if x.ndim == 1:
        x = np.stack([x * np.sqrt(.5 * (1 - pan)), x * np.sqrt(.5 * (1 + pan))], 1) * np.sqrt(2)
    L, R = stems[stem][:, 0], stems[stem][:, 1]
    M.place(L, R, x, t, g)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bp", fs=SR, output="sos"), x, axis=0)


def lp(x, hz):
    return sosfilt(butter(2, hz, "lp", fs=SR, output="sos"), x, axis=0)


def pink(n):
    w = rng.standard_normal(n)
    f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n).astype(np.float32) / 30


def env_ar(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-np.maximum(t - a, 0) / r)


def song(prog, notes, drum=False):
    m = pm.PrettyMIDI(initial_tempo=90)
    ins = pm.Instrument(program=prog, is_drum=drum)
    for p, s, e, v in notes:
        ins.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=float(s), end=float(e)))
    m.instruments.append(ins)
    return m


def midi(prog, notes, drum=False, tail=2.0, **fx):
    """render notes (absolute times) and return full-length stereo array"""
    x = M.render(song(prog, notes, drum), tail=tail)
    x = M.scene_fx(x, **fx)
    out = np.zeros((N, 2), np.float32); n = min(N, len(x)); out[:n] = x[:n]
    return out


def gate(x, t0, t1, fin=.02, fout=.25):
    """keep only t0..t1 (+release) of a full-length stem"""
    t = np.arange(N) / SR
    g = np.clip((t - t0) / fin + 1, 0, 1) * np.clip((t1 + fout - t) / fout, 0, 1)
    return x * g[:, None]


# ---------------- MUSIC: continuous bed (low strings + contrabass), A minor -> A major at the end ----------
bed_chords = [  # (start, end, pitches)
    (0.0, C["s2"], [45, 52, 57]),          # Am
    (C["s2"], C["s2b"], [41, 48, 57]),     # F
    (C["s2b"], C["s3"], [43, 50, 55]),     # G
    (C["s3"], C["s4"], [38, 50, 57, 62]),  # Dm (amber lift)
    (C["s4"], C["freeze"], [45, 52, 59]),  # Asus2
    (C["freeze"], DUR + .5, [45, 52, 61, 64]),  # A major (resolve)
]
bed = midi(48, [(p, s, e + .05, 62) for s, e, ps in bed_chords for p in ps], rev=2.6, wet=.35, damp_hz=3500, lp_hz=5000, hp_hz=50)
bed += .8 * midi(43, [(33, 0, C["s3"], 70), (38, C["s3"], C["s4"], 70), (33, C["s4"], DUR + .5, 45)], rev=2.6, wet=.3, damp_hz=3000, lp_hz=2500)
t = np.arange(N) / SR
benv = np.ones(N, np.float32)
for a, b in QUIET:  # duck to -14 dB in the near-silence windows (never zero)
    d = np.clip(np.minimum((t - a) / .12, (b - t) / .25), 0, 1) if b < DUR else np.clip((t - a) / .3, 0, 1)
    benv *= 1 - d * (1 - 10 ** (-14 / 20))
benv *= np.clip(t / .4, .25, 1)  # soft fade-in from the first frame (starts at -12 dB, not zero)
benv *= np.where(t > 14.4, np.clip((DUR - t) / .6, .5, 1), 1)  # end tail, still audible at the last frame
stems["bed"] += bed * benv[:, None]

# ---- S1 BOOT (red): electric piano + glockenspiel + timpani roll; small dark room, low-passed ----
s1fx = dict(rev=.7, wet=.3, damp_hz=2500, lp_hz=4500, hp_hz=90)
arp = [57, 60, 64, 69, 64, 60]
ep = [(arp[i % 6] + 12 * (i // 6 % 2 == 1), C["eyes"] + i * BEAT / 2, C["eyes"] + i * BEAT / 2 + .3, 52 + 3 * i) for i in range(5)]
stems["music"] += midi(4, ep, **s1fx)
stems["music"] += midi(9, [(88, C["eyes"], C["eyes"] + .4, 70)], **s1fx) * .7  # glock layered with ping #1
roll = [(47 - 2, C["crouch"] - .45 + i * .045, C["crouch"] - .45 + i * .045 + .04, 35 + i * 5) for i in range(14)]
stems["music"] += midi(47, roll + [(45, C["go"], C["go"] + .6, 120)], **s1fx)
stems["music"] += midi(0, [(36, C["go"], C["go"] + .2, 125), (49, C["go"], C["go"] + 1, 110)], drum=True, rev=.7, wet=.25, damp_hz=4000, hp_hz=30)

# ---- S2 DASH (cobalt): drum kit + synth bass + muted guitar; tight, dry, wide, bright ----
s2fx = dict(rev=.35, wet=.12, damp_hz=9000, hp_hz=35)
dr = []
for i in range(int((C["s3"] - C["s2"]) / (BEAT / 2)) + 1):
    tt = C["s2"] + i * BEAT / 2
    if tt >= C["s3"] - .01: break
    dr.append((42, tt, tt + .05, 70 + 15 * (i % 2 == 0)))
    if i % 2 == 0: dr.append((36, tt, tt + .1, 100))
    if i % 4 == 2: dr.append((38, tt, tt + .1, 105))
dr += [(49, C["s2"], C["s2"] + 1, 105), (49, C["s2b"], C["s2b"] + 1, 95), (38, C["s3"] - BEAT / 4, C["s3"] - .1, 90), (38, C["s3"] - BEAT / 8, C["s3"] - .05, 100)]
stems["music"] += midi(0, dr, drum=True, **s2fx) * .9
bass = []
for i in range(int((C["s3"] - C["s2"]) / (BEAT / 2))):
    tt = C["s2"] + i * BEAT / 2
    root = 29 if tt < C["s2b"] else 31
    bass.append((root + 12 * (i % 4 == 3), tt, tt + BEAT / 2 - .04, 100))
stems["music"] += midi(38, bass, rev=.3, wet=.08, damp_hz=6000, lp_hz=2500, hp_hz=35) * .8
gtr = [(p, C["s2"] + i * BEAT / 4, C["s2"] + i * BEAT / 4 + .08, 70 + 20 * (i % 4 == 0))
       for i in range(int((C["s3"] - C["s2"]) / (BEAT / 4))) for p in ([53, 57, 60] if C["s2"] + i * BEAT / 4 < C["s2b"] else [55, 59, 62]) if i % 2 == 0 or i % 8 == 7]
stems["music"] += midi(28, gtr, rev=.35, wet=.12, damp_hz=9000, hp_hz=200) * .45

# ---- S3 LEAP (amber): brass + taiko + choir; medium warm hall; slow-mo section filtered ----
s3fx = dict(rev=1.8, wet=.3, damp_hz=5000, lp_hz=7000, hp_hz=60)
br = [(p, C["s3"], C["s3"] + .25, 105) for p in (50, 57, 62)] + [(p, C["jump"], C["jump"] + .45, 115) for p in (53, 60, 65)]
stems["music"] += midi(61, br, **s3fx)
stems["music"] += midi(116, [(48, C["s3"], C["s3"] + .3, 120), (48, C["jump"] - BEAT / 4, C["jump"] - .1, 100), (43, C["jump"], C["jump"] + .4, 125)], **s3fx)
ch = midi(52, [(p, C["slowIn"] - .1, C["bolt2"] + .1, 70) for p in (62, 65, 69)], rev=2.4, wet=.45, damp_hz=3000, lp_hz=1800, hp_hz=150)
stems["music"] += ch * .5
stems["music"] += midi(55, [(p, C["bolt2"], C["bolt2"] + .3, 120) for p in (50, 57, 62)], rev=1.8, wet=.3, damp_hz=5000, hp_hz=60) * .45
stems["music"] += midi(47, [(38, C["bolt2"], C["bolt2"] + .8, 120)], **s3fx) * .5
# J-cut into the title: reverse cymbal swells across the white flash and lands on s4
rc = midi(119, [(60, C["whiteIn"] - .95, C["s4"] + .05, 110)], rev=1.2, wet=.2, damp_hz=8000, hp_hz=300, tail=.1)
stems["music"] += gate(rc, 0, C["s4"] + .02, fout=.04) * .8

# ---- S4 TITLE (magenta+cyan): harp + vibraphone + voice oohs + flute; big bright hall ----
s4fx = dict(rev=3.0, wet=.4, damp_hz=9000, hp_hz=140)
scale = [57, 59, 61, 64, 66, 69, 71, 73, 76, 78, 81]
stems["music"] += 1.3 * midi(46, [(p, C["s4"] + i * .045, C["s4"] + 1.2, 80 + i * 3) for i, p in enumerate(scale)], **s4fx)
letters = [C["titleOn"] + i * .13 for i in range(9)]  # N E O N / A L L E Y ignite
vib = [69, 73, 76, 81, 69, 71, 73, 76, 81]
stems["music"] += midi(11, [(p, tt, tt + .5, 75) for p, tt in zip(vib, letters)], **s4fx) * .8
stems["music"] += midi(53, [(p, C["land"], C["freeze"] + .2, 60) for p in (64, 69, 73)], **s4fx) * .5
stems["music"] += midi(73, [(p, C["sub"] + i * BEAT / 2, C["sub"] + i * BEAT / 2 + .3, 72) for i, p in enumerate([76, 73, 71, 69])], **s4fx) * .6
stems["music"] += midi(108, [(93, C["blink"], C["blink"] + .5, 80)], **s4fx) * .8  # kalimba layered with ping #2
stems["music"] += midi(0, [(36, C["land"], C["land"] + .2, 100), (57, C["land"], C["land"] + 1.5, 100)], drum=True, **s4fx) * .55
stems["music"] += midi(11, [(p, 14.1, DUR, 62) for p in (69, 73, 76)], **s4fx) * .6  # last held chord
for a, b in QUIET:  # scene music also drops (but the bed keeps going)
    d = np.clip(np.minimum((t - a) / .1, (b - t) / .25), 0, 1) if b < DUR else np.clip((t - a) / .25, 0, 1)
    keep = np.ones(N, np.float32) * (1 - d * (1 - 10 ** (-20 / 20)))
    stems["music"] *= keep[:, None]

# ---------------- AMBIENCE (synth; pink noise band + harmonic neon hum, different per scene) ----------------
def neon_buzz(dur, f0, flick=None):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f0 * h * tt + rng.uniform(0, 6)) / h ** 1.2 for h in range(1, 8))
    x = x * (1 + .15 * np.sin(2 * np.pi * 7.3 * tt)) + .3 * bp(rng.standard_normal(n), 2000, 6000)
    return (x / 4 * (flick if flick is not None else 1)).astype(np.float32)

for name, a, b in SCENES:
    n = int((b - a + .5) * SR); tt = np.arange(n) / SR
    fade = np.minimum(np.clip(tt / .25, 0, 1), np.clip((b - a + .5 - tt) / .5, 0, 1))
    if name == "S1 BOOT":  # tight alley room tone + red neon buzz that stutters on
        x = lp(pink(n), 500) * 2.0
        fl = np.ones(n);
        for k, (s_, e_) in enumerate([(0, .17), (.21, .27), (.31, .4), (.45, .52)]):
            fl[int(s_ * SR):int(e_ * SR)] = 0
        x = x + neon_buzz(n / SR, 60, fl) * .25
        put("amb", np.stack([x, x * .9], 1), a, .9)
    elif name == "S2 DASH":  # wind rush, brighter, moving
        x = bp(pink(n), 500, 4000) * (1 + .5 * np.sin(2 * np.pi * .8 * tt))
        put("amb", np.stack([x * (1 + .3 * np.sin(2 * np.pi * .5 * tt)), x * (1 - .3 * np.sin(2 * np.pi * .5 * tt))], 1) * fade[:, None] * 2.2, a)
    elif name == "S3 LEAP":  # warm low air, darker under the slow-mo
        x = bp(pink(n), 150, 1500) * 2.0
        put("amb", np.stack([x, x], 1) * fade[:, None], a)
    else:  # airy stage hiss + higher cyan neon hum
        x = bp(pink(n), 2000, 8000) * .5 + neon_buzz(n / SR, 100) * .12
        put("amb", np.stack([x, x * .95], 1) * fade[:, None], a)
for a, b in QUIET:
    d = np.clip(np.minimum((t - a) / .1, (b - t) / .25), 0, 1) if b < DUR else np.clip((t - a) / .25, 0, 1)
    stems["amb"] *= (1 - d * (1 - 10 ** (-16 / 20)))[:, None]

# ---------------- SFX: CC0 recordings (Kenney) + few synth layers ----------------
S = lambda nm, g=1.0: sfx_lib.load(nm, SR, g)
def thunder(seed, length, cutoff):
    r = np.random.default_rng(seed); n = int(length * SR)
    x = lp(r.standard_normal(n), cutoff) * env_ar(n, .02, length / 4) * (1 + .6 * np.sin(np.arange(n) / SR * 2 * np.pi * 9))
    return (x * .6).astype(np.float32)
def whoosh(dur, lo, hi, seed):
    r = np.random.default_rng(seed); n = int(dur * SR); out = np.zeros(n, np.float32); hop = 1024
    w = pink(n) * 30 * .02
    for i in range(0, n, hop):
        f = lo * (hi / lo) ** (i / n)
        out[i:i + hop] = bp(w[max(0, i - 4096):i + hop], f * .7, min(f * 1.6, 18000))[-len(out[i:i + hop]):]
    return out * np.sin(np.pi * np.arange(n) / n) ** 2
def ping(f, dur=.35):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * np.exp(-tt / .08) * .25).astype(np.float32)

ev = []  # (time, layer, name, gain, pan)
for k, tt in enumerate([C["signsOn"], C["signsOn"] + .1, C["signsOn"] + .22, C["signsOn"] + .32]):
    ev.append((tt, "sfx", ["switch_002", "glitch_002", "switch_005", "glitch_003"][k], .5, -.4 + .25 * k))
ev += [(C["eyes"], "sfx", "maximize_004", .45, 0), (C["crouch"], "sfx", "cloth2", .8, 0), (C["crouch"] + .1, "sfx", "creak3", .35, .2),
       (C["go"], "sfx", "impactMetal_heavy_002", .5, 0), (C["bolt1"], "sfx", "impactPlate_heavy_003", .5, .3)]
for i in range(6):  # wheel bumps on wet concrete during the dash, varying gain/pan
    tt = C["s2"] + i * BEAT * .98 + .05
    ev.append((tt, "sfx", f"footstep_concrete_00{i % 5}", .35 + .1 * rng.random(), rng.uniform(-.4, .4)))
ev += [(C["s2b"], "sfx", "impactMetal_light_001", .45, .5), (C["weave"], "sfx", "impactTin_medium_002", .45, -.5), (C["weave"] + .33, "sfx", "impactMetal_light_003", .35, .5),
       (C["jump"] - .08, "sfx", "impactPlank_medium_001", .5, 0), (C["jump"], "sfx", "impactWood_heavy_002", .7, 0),
       (C["slowIn"] + .25, "sfx", "impactSoft_medium_001", .15, 0), (C["slowIn"] + .65, "sfx", "impactSoft_medium_003", .12, 0),
       (C["bolt2"], "sfx", "impactMining_001", .4, -.3), (C["bolt2"] + .01, "sfx", "impactGlass_heavy_002", .22, .3),
       (C["land"], "sfx", "impactSoft_heavy_002", .45, 0), (C["land"] + .02, "sfx", "impactMetal_medium_001", .5, 0)]
for i, tt in enumerate(letters):
    ev.append((tt, "sfx", ["switch_001", "glitch_001", "switch_003", "glitch_004", "switch_006", "switch_004", "glitch_002", "switch_007", "toggle_002"][i], .22, -.5 + i * .12))
ev += [(C["sub"], "sfx", "select_003", .25, 0), (C["blink"], "sfx", "toggle_003", .3, 0)]
for tt, layer, nm, g, pan in ev:
    try:
        put(layer, S(nm), tt, g, pan)
    except KeyError:
        print("missing sfx", nm)
# slow-mo heartbeats are low-passed
# synth layers (counted toward the synth ratio): 2 pings total, thunder rumbles, noise whooshes. No sine sweeps.
put("synth_sfx", ping(1760), C["eyes"], .5)              # ping 1 (layered with glock + UI recording)
put("synth_sfx", ping(2093), C["blink"], .4)             # ping 2 (layered with kalimba + toggle)
put("synth_sfx", thunder(11, 2.2, 300), C["bolt1"], .55)  # L-cut: rumble rings over the S2 cut
put("synth_sfx", thunder(23, 1.6, 600), C["bolt2"], .5)
put("synth_sfx", whoosh(.45, 300, 3000, 5), C["go"] - .15, .8)
put("synth_sfx", whoosh(.5, 400, 4000, 6), C["s2b"] - .35, .6, .3)
put("synth_sfx", whoosh(.5, 3000, 400, 7), C["weave"] - .2, .6, -.3)
put("synth_sfx", whoosh(.55, 250, 2500, 8), C["s3"] - .3, .7)
for a, b in QUIET:  # sfx thinned in the windows except the deliberate soft heartbeats
    d = np.clip(np.minimum((t - a) / .05, (b - t) / .2), 0, 1) if b < DUR else np.clip((t - a) / .2, 0, 1)
    stems["synth_sfx"] *= (1 - d * (1 - 10 ** (-12 / 20)))[:, None]

# ---------------- MIX ----------------
gains = dict(bed=1.0, music=1.0, amb=.7, sfx=1.0, synth_sfx=1.0)
mix = sum(stems[k] * g for k, g in gains.items())
mix = mix / (np.abs(mix).max() + 1e-9) * .8
wavfile.write(os.path.join(OUT, "neon_alley_ours.wav"), SR, (mix * 32767).astype(np.int16))

# ---------------- STATS ----------------
def db(x): return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12))
norm = .8 / (np.abs(sum(stems[k] * g for k, g in gains.items())).max() + 1e-9)
E = {k: float(np.sum((stems[k] * gains[k]) ** 2)) for k in stems}
synth_ratio = (E["amb"] + E["synth_sfx"]) / sum(E.values())
stats = {"synth_energy_ratio": round(synth_ratio, 3), "scenes": {}, "quiet_windows": [], "bed_min_rms_db_per_100ms": None}
for name, a, b in SCENES:
    seg = mix[int(a * SR):int(b * SR)].mean(1)
    F = np.abs(np.fft.rfft(seg)) ** 2; fr = np.fft.rfftfreq(len(seg), 1 / SR)
    stats["scenes"][name] = dict(rms_db=round(db(seg), 1), centroid_hz=int((F * fr).sum() / F.sum()), hi_ratio_gt4k=round(float(F[fr > 4000].sum() / F.sum()), 3))
for a, b in QUIET:
    stats["quiet_windows"].append(dict(t=[round(a, 3), round(b, 3)], rms_db=round(db(mix[int(a * SR):int(b * SR)]), 1)))
stats["mix_rms_db"] = round(db(mix), 1)
bm = stems["bed"] * norm
w = int(.1 * SR)
_bl = [db(bm[i:i + w]) for i in range(0, N - w, w)]; stats["bed_min_rms_db_per_100ms"] = round(min(_bl), 1); stats["bed_min_at_s"] = round(int(np.argmin(_bl)) * .1, 1); stats["bed_rms_db_per_100ms_quiet2"] = round(float(np.median(_bl[134:141])), 1)
stats["bed_mean_rms_db"] = round(db(bm), 1)
stats["pings"] = 2; stats["sine_sweeps"] = 0
cues = dict(source="C/engine/src/timeline.js (90 BPM) + contact sheet", seed=1234,
            cues={k: round(v, 3) for k, v in C.items()},
            sound_bible={
                "S1 BOOT 0-3.333": "e.piano(4)+glock(9)+timpani roll(47)+kick/crash; room rev0.7 dark(2.5k) lp4.5k; amb: room tone+60Hz neon buzz stutter",
                "S2 DASH 3.333-7.333": "drum kit+synth bass(38)+muted guitar(28); dry rev0.35 bright; amb: moving wind band 0.5-4k",
                "S3 LEAP 7.333-10.0": "brass(61)+taiko(116)+choir(52)+orch hit(55)+timpani; hall rev1.8 warm lp7k; slow-mo filtered; reverse cymbal(119) J-cut",
                "S4 TITLE 10.0-15.0": "harp gliss(46)+vibraphone(11) per letter+voice oohs(53)+flute(73)+kalimba(108); big bright hall rev3.0 hp140",
                "bed 0-15": "strings(48)+contrabass(43) chords Am-F-G-Dm-Asus2-A, ducked -14dB in quiet windows"},
            events=[dict(t=round(e[0], 3), name=e[2]) for e in ev],
            synth=["ping1 1760Hz@1.333", "ping2 2093Hz@12.533", "thunder@3.067 (L-cut)", "thunder@9.333", "noise whooshes x4", "ambience beds"],
            quiet_windows=[list(map(lambda v: round(v, 3), q)) for q in QUIET],
            j_l_cuts=["reverse cymbal 8.98->10.0 (J)", "thunder1 rumble over S2 cut 3.333 (L)", "choir from 8.3 over bolt2 (L)", "S3 whoosh starts 7.03 before cut (J)"],
            stats=stats)
json.dump(cues, open(os.path.join(OUT, "cues.json"), "w"), indent=1, ensure_ascii=False)
print(json.dumps(stats, indent=1))

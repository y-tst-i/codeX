#!/usr/bin/env python3
"""作業場所(WORK)の準備。git の枝 claude/motion2d-hitotsuzutsu から映像と既存の音(条件 A)を取り出し、
A の音を元のスクリプトで再現してステム(音楽 / 効果音)を作る(監査と qa.py の場面分析に使う)。何度実行してもよい(あれば飛ばす)。
usage: python prepare.py          前提: git fetch origin claude/motion2d-hitotsuzutsu 済み
出力: WORK/src/(hitotsuzutsu_final.mp4・video_only.mp4・A_original_audio.wav/.m4a・cues.json ほか)、
      WORK/A_repro/motion2d-hitotsuzutsu/sound/(stem_music.wav・stem_sfx.wav・mix.wav)
A の再現は、元の make_audio.py をそのまま(変更せず)写し、元と同じフォルダ構成の中で実行する。
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

BR = "origin/claude/motion2d-hitotsuzutsu"
P = "motion2d-hitotsuzutsu"


def show(path, out):
    if os.path.exists(out):
        return True
    r = subprocess.run(["git", "-C", C.REPO, "show", f"{BR}:{P}/{path}"], capture_output=True)
    if r.returncode:
        print(f"skip: {BR}:{P}/{path} を読めない(git fetch origin claude/motion2d-hitotsuzutsu を先に)")
        return False
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "wb").write(r.stdout)
    return True


def main():
    src = os.path.join(C.WORK, "src")
    ok = show("hitotsuzutsu_final.mp4", os.path.join(src, "hitotsuzutsu_final.mp4"))
    for f in ("cues.json", "design.md", "motion-map.md", "holds.json"):
        show(f, os.path.join(src, f))
    if not ok:
        sys.exit("映像を取り出せない: git clone した作業コピーで、git fetch origin claude/motion2d-hitotsuzutsu の後に実行する(git archive の写しでは動かない)")
    if ok:
        mp4 = os.path.join(src, "hitotsuzutsu_final.mp4")
        for out, args in (("video_only.mp4", ["-an", "-c:v", "copy"]), ("A_original_audio.m4a", ["-vn", "-c:a", "copy"]),
                          ("A_original_audio.wav", ["-vn", "-c:a", "pcm_s24le"])):
            o = os.path.join(src, out)
            if not os.path.exists(o):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, *args, o], check=True)
    # A のステムの再現
    rep = os.path.join(C.WORK, "A_repro")
    snd = os.path.join(rep, P, "sound")
    if os.path.exists(os.path.join(snd, "stem_music.wav")):
        print("A stems: already there"); return
    if not (show("sound/make_audio.py", os.path.join(snd, "make_audio.py")) and show("cues.json", os.path.join(rep, P, "cues.json"))):
        print("A stems: skipped"); return
    tools = os.path.join(rep, "claude-video-skill", "tools")
    os.makedirs(os.path.dirname(tools), exist_ok=True)
    if not os.path.exists(tools):
        os.symlink(os.path.join(C.REPO, "claude-video-skill", "tools"), tools)
    subprocess.run([sys.executable, os.path.join(snd, "make_audio.py")], check=True)
    print("A stems ->", snd)


if __name__ == "__main__":
    main()

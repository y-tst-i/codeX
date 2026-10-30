# LUMIWAKE 15s teaser(2D 試験の初稿 v1)
架空のゲームの15秒ティザー。HyperFrames の1コンポジション(Canvas 2D に draw(t) で描く)。所見は `docs/2d-trial/FINDINGS.md`。
- 設計: `BRIEF.md` / `STORYBOARD.md`(cue表・場面カード・motion-prompt の動き→ID 対応表)
- 音: `python3 make_audio.py` → `out/mix_raw.wav`(MIDI + 無料GM音源 + Kenney CC0)。プレビューで鳴らすには `cp out/mix_raw.wav assets/audio/mix.wav`
- 書き出し: `npx hyperframes render --output render_raw.mp4 --fps 30 --crf 14` → 音は `tools/assemble.sh` の2回通し loudnorm の値で作り、`-c:v copy` で結合(手順は FINDINGS.md)
- 動画(mp4)はリポジトリに入れていない。

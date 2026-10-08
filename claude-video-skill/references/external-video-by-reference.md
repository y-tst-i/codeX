# 外部スキル `video-by-reference` の使い方(動画の依頼ではまずこれ)
- 出典: github.com/ishuagrawal/skills(MIT)。「手本の動画を測って学び、オリジナルの動画を作る」。第三者のコードなので、**実行する前にスクリプト(analyze_media.py / review.py / render.mjs)の中身を読む**。
- 入れ方(PC の Claude Code): `/plugin marketplace add ishuagrawal/skills` → `/plugin install skills@ishuagrawal` → `/reload-plugins`。クラウドでは `git clone --depth 1 https://github.com/ishuagrawal/skills` して、その `skills/video-by-reference/SKILL.md` を読ませる。
- 渡すもの: ①手本の動画(ファイル)②依頼(長さ・解像度・fps・音つき・内容・禁止事項)。**スマホ画面の録画は、上下の黒とUIを先に ffmpeg で切り出す**(解析が画面全体前提)。
- 依頼のひな形に入れること: 絵柄・登場物は真似ない(水準を真似る)/ 実在のブランド・実績・受賞を使わない / 無料の道具のみ / 完了時に ffprobe と review.py の結果、トークンと時間を報告。
- 試験で分かった点: 既定は 24fps・2D向けの部品。**30fps なら値を直す**。3Dにしたいときは three.js を自分で組み込む(自作スキルの `tools/new_scene_three.sh` と `references/three-3d.md` が使える)。Chrome は root で起動しないので `--no-sandbox` が要る。描画は遅い(15秒で約19分)。
- 担当は1人で通す(`general-purpose` + `model: opus`、エフォート high)。
- 補助として自作の道具を足せる: 録音済み効果音(`tools/sfx_lib.py`)、楽器音源(`tools/midi_render.py`)、音量調整(`tools/assemble.sh`)、3D の仕上げ(`tools/assets/three/post.js`)。**ただし、足して良くなるかは未検証。**

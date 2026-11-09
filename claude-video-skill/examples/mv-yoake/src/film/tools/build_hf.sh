#!/usr/bin/env bash
# HyperFrames のプロジェクトを作る(生成物。git に入れない)。歌詞の時刻(audio/lyric_timeline.json)と台帳(audio/cues.json)を埋め込み直す。
#   使い方: bash build_hf.sh <出力フォルダ> [曲.mp3(プレビュー用。任意)]
#   前提: フォント(assets/fonts)と字形の点列(src/lib/glyphs.js)を README の手順で用意済み
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)"; ex="$(cd "$src/../.." && pwd)"; tools="$(cd "$ex/../../tools/assets" && pwd)"
out="${1:?出力フォルダ}"; mp3="${2:-}"; mkdir -p "$out/assets/fonts"
python3 -I "$src/tools/gen_data.py" "$ex/audio/lyric_timeline.json" "$ex/audio/cues.json" "$src/data.gen.js" >/dev/null
cp "$ex"/assets/fonts/*.woff2 "$out/assets/fonts/"
if [ ! -f "$out/assets/gsap.min.js" ]; then tmp="$(mktemp -d)"; (cd "$tmp" && npm pack gsap@3.14.2 >/dev/null 2>&1 && tar xzf gsap-*.tgz); cp "$tmp/package/dist/gsap.min.js" "$out/assets/gsap.min.js"; fi
cat "$tools/scene-lib.js" "$tools/depth.js" "$ex/src/lib/paint.js" "$ex/src/lib/glyphs.js" "$ex/src/lib/kairo.js" \
    "$src/data.gen.js" "$src/core.js" "$src/city.js" "$src/type.js" "$src/film.js" "$src/shots_night.js" "$src/shots_chorus.js" "$src/shots_dawn.js" > "$out/assets/film.js"
faces="$(sed "s#url('#url('assets/fonts/#g" "$ex/assets/fonts/jp.css" | tr '\n' ' ')"
audio=""; if [ -n "$mp3" ]; then cp "$mp3" "$out/assets/song.mp3"; audio='<audio id="song" src="assets/song.mp3" data-start="0" data-duration="53" data-track-index="1" data-volume="1"></audio>'; fi
python3 -I - "$src/index.template.html" "$out/index.html" "$faces" "$audio" <<'PY'
import sys; t = open(sys.argv[1], encoding="utf-8").read(); open(sys.argv[2], "w", encoding="utf-8").write(t.replace("/*JP_FONT_FACES*/", sys.argv[3]).replace("<!--AUDIO-->", sys.argv[4]))
PY
printf '{"id":"yoake","name":"yoake"}\n' > "$out/meta.json"
printf '{"$schema":"https://hyperframes.heygen.com/schema/hyperframes.json","paths":{"blocks":"compositions","components":"compositions/components","assets":"assets"}}\n' > "$out/hyperframes.json"
echo "built $out"

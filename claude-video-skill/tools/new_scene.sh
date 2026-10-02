#!/bin/bash
# 1場面ぶんの HyperFrames プロジェクトを一発で作る(毎回のひな形・gsap・部品を書き直さないための節約道具)
# usage: new_scene.sh <dir> <秒数> [背景色 #rrggbb] [--puppet]   --puppet: 2.5D キャラ部品(PUPPET)も埋め込む
#   -> <dir>/index.html の draw(t) だけ書けばよい。部品は SCENE_LIB(乱数/補間/タイムリマップ/雨/ビネット/グロー/透視)
#   検証: cd <dir> && npx hyperframes check ; 書き出し: npx hyperframes render --output ../out/<id>.mp4
set -e
dir=$1; sec=$2; bg=${3:-#0a0a12}; opt=$4; here=$(cd "$(dirname "$0")" && pwd)
[ -z "$dir" ] || [ -z "$sec" ] && { sed -n 2,6p "$0"; exit 1; }
mkdir -p "$(dirname "$dir")"
npx --yes hyperframes init "$dir" --non-interactive --skip-transcribe >/dev/null 2>&1 || npx --yes hyperframes init "$dir" --non-interactive >/dev/null
mkdir -p "$dir/assets"; cp "$here/assets/gsap.min.js" "$dir/assets/gsap.min.js"
lib=$(cat "$here/assets/scene-lib.js")
[ "$opt" = "--puppet" ] && lib="$lib
$(cat "$here/assets/puppet.js")"
cat > "$dir/index.html" <<HTML
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${bg}; }
      #root { position: relative; width: 1920px; height: 1080px; background: ${bg}; overflow: hidden; }
      canvas { position: absolute; left: 0; top: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${sec}" data-width="1920" data-height="1080">
      <canvas id="c" width="1920" height="1080"></canvas>
    </div>
    <script>
${lib}
      const { clamp, lerp, smooth, ease, mulberry32, rain, vignette, glow, project, timeRemap } = SCENE_LIB;
      const DUR = ${sec}, ctx = document.getElementById("c").getContext("2d");
      // ★ここだけ書く: 時刻 t(秒) の純関数。Math.random / Date.now を使わない(乱数は mulberry32(seed))。
      function draw(t) {
        ctx.clearRect(0, 0, 1920, 1080);
        ctx.fillStyle = "${bg}"; ctx.fillRect(0, 0, 1920, 1080);
        // TODO: 場面カードの内容を描く(ビネットは必要な場面だけ vignette(ctx, 0.35) を呼ぶ)
      }
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true }), st = { t: 0 };
      tl.to(st, { t: DUR, duration: DUR, ease: "none", onUpdate: () => draw(st.t) }, 0);
      draw(0); window.__timelines["main"] = tl;
    </script>
  </body>
</html>
HTML
echo "作成: $dir/index.html (${sec}s)"

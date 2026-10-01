/** 動画を書くClaudeに渡す、道具箱（window.MGK）の説明と、使い方のルール */
export const MGK_PROMPT = `# 演出の道具箱 window.MGK（必ず使う）
このツールは、HTMLの読み込み前に \`window.MGK\` を自動で用意します（自分で定義しない・コピーしない）。よく調整された部品なので、**自前で書くより MGK を使う方が質が高く、コードも短くなります**。浮いた分の力を、演出の密度と振り付けに使ってください。
すべて t（秒）だけで絵が決まる純粋関数です。\`const K = window.MGK;\` として使います。W=1080, H=1920。

## 動き・時間
- \`K.prog(t, a, b)\` 0〜1の進み具合 ／ \`K.anim(t, start, dur, "outBack")\` イージング済みの0〜1 ／ \`K.mix(a, b, p)\` ／ \`K.clamp\`
- \`K.ease.{outExpo, outBack, outBackBig, inBack, inOutCubic, outElastic, outBounce, inExpo ...}\`
- \`K.keys(t, [{t:0, x:900, y:1500, size:800}, {t:0.6, x:600, ease:"outBack"}, {t:2.4, x:300, size:1300, ease:"inOutCubic"}])\` キーフレーム補間（キャラや物体の振り付けに最適）
- \`K.hop(t, start, dur, height)\` → {y, sx, sy} 放物線ジャンプ＋踏み切り/着地のつぶれ
- \`K.spring(s, freq, damp)\` 経過s秒のバネ ／ \`K.punch(t, [時刻...], dur)\` その時刻に1→0へ減衰（強調語の「叩き」）／ \`K.envelope(t, start, in, hold, out)\`
- \`K.shake(t, start, dur, amp, seed)\` → {x, y, r} ／ \`K.noise(x, seed)\` なめらかな-1〜1 ／ \`K.rand(i, seed)\` 番号から決まる乱数
- \`K.voice(t)\` ナレーションの音量 0〜1（声に合わせて画面を脈打たせられる）

## カメラ
- \`K.camera(ctx, {x, y, zoom, rot})\` 画面中心からのずれで世界を動かす（ctx.save()/restore() で囲む）
- \`K.drift(t, amount)\` → 手持ちカメラのゆっくりした揺れ {x, y, zoom, rot}。**常に足す**（止まった画面をなくす）

## 背景（全面を描く。2〜3種類を重ねて奥行きを出す）
- \`K.bg.mesh(ctx, t, [地の色, 色1, 色2, ...], {speed, alpha})\` 色の雲が流れるグラデーション（ほぼ全シーンの土台に）
- \`K.bg.bokeh(ctx, t, {colors, count, size, alpha, speed})\` 漂う光の玉
- \`K.bg.floaters(ctx, t, {shape:"heart"|"star"|"sparkle"|"circle", colors, count, size, speed})\` 浮かぶハート・星（恋愛・ほめる場面）
- \`K.bg.rays(ctx, t, {color, x, y, count, speed, alpha})\` 回転する放射線（結論・ランキング1位・決め）
- \`K.bg.speedLines(ctx, t, {color, x, y, count, inner, alpha})\` 漫画の集中線（驚き・ツッコミの瞬間）
- \`K.bg.halftone(ctx, t, {color, size, alpha})\` ／ \`K.bg.stripes(ctx, t, {color, width, angle, speed, alpha})\` ／ \`K.bg.grid(ctx, t, {color, horizon, speed})\`

## パーティクル・衝撃
- \`K.particles.burst(ctx, t, start, {x, y, count, colors, shape:"confetti"|"heart"|"star"|"sparkle"|"circle", speed, gravity, size, life, angle, spread})\`
- \`K.particles.ring(ctx, t, start, {x, y, color, radius, width})\` 衝撃波の輪
- \`K.fx.flash(ctx, t, at, dur, color)\` 一瞬の白フラッシュ

## 転換（シーン境界に必ず使う）
- \`K.transition(ctx, t, at, dur, type, drawA, drawB, {color, colors, x, y, dir})\`
  type: "wipe"（斜めワイプ＋色帯）/ "circle"（円で開く。x,yを主役の位置に）/ "zoom"（突き抜けズーム）/ "whip"（高速パン）/ "shapes"（色の帯が横切る）/ "slice"（短冊）/ "flash"
  drawA / drawB は、それぞれのシーンを全面描画する関数。境界をまたいで 0.3〜0.5 秒かける

## 文字
- \`K.text(ctx, t, "文字", x, y, {size, family, weight, color, stroke, strokeWidth, shadow, accent:["強調語"], accentColor, maxWidth, align, start, stagger, dur, anim, end})\`
  anim: "pop"（弾む）/ "slam"（叩きつけ）/ "rise"（下から）/ "drop"（上から落ちて跳ねる）/ "wave"（波打つ）/ "type"（タイプ）。1文字ずつ時間差で動く。end を渡すとその時刻から退場。日本語の禁則つき自動改行
- \`K.marker(ctx, t, x, y, w, h, start, color)\` 蛍光ペンの帯（文字の下に先に描く）／ \`K.bubble(ctx, t, x, y, w, h, {start, color, stroke, tailX, tailY})\` キャラの吹き出し ／ \`K.count(t, start, dur, from, to)\` 数字のカウントアップ
- \`K.shape.{heart, star, sparkle, roundRect, circle}(ctx, ...)\` パスを作る（そのあと fill / stroke）

## 仕上げ（render の最後に毎回）
- \`K.fx.lightLeak(ctx, t, {color, alpha})\` → \`K.fx.vignette(ctx, 0.3)\` → \`K.fx.grain(ctx, t, 0.06)\`

## 効果音の指定（MG.sfx）
映像の動きに合わせて、ツールが効果音を合成して入れます。**window.MG に \`sfx\` 配列を足して、どの時刻にどの音を鳴らすか指定**してください（音そのものは作らない）。
\`\`\`js
sfx: [ { t: 0.0, type: "impact" }, { t: 0.5, type: "pop" }, { t: 2.42, type: "whoosh" }, { t: 6.0, type: "impact", volume: 1.2 }, ... ]
\`\`\`
- type: "whoosh"（転換・大きく動く）/ "swipe"（短い転換・スライド）/ "pop"（文字や物が出る）/ "impact"（叩きつけ・驚き・着地）/ "ding"（正解・結論・CTA）/ "sparkle"（キラキラ・ほめる）/ "tick"（カウント・項目が並ぶ）/ "riser"（溜め：大きな見せ場の1秒前から）/ "heart"（ときめき）/ "bubble"（吹き出し・小さな登場）
- 映像の動きと**同じ時刻**に置く（K.transition の at の0.15秒前に whoosh、slam の文字の開始に impact、burst の start に sparkle など）
- 1秒に2つまで。声の強調語と重なる大きな音（impact）は1シーン1回まで。volume は 0.3〜1.3

## 画面の組み立て方（この構造で書く）
\`\`\`js
const K = window.MGK;
function render(t) {
  ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  // 1. 背景（カメラより遅く動く＝奥にある）：シーンごとに配色や種類を変える
  // 2. ワールド：ctx.save(); K.camera(ctx, カメラ = K.drift(t) ＋ シーンの寄り引き ＋ 強調語の punch ズーム ＋ shake); 主役の図形・文字・キャラ; ctx.restore();
  //    シーン境界は K.transition(ctx, t, 境界, 0.4, "whip", drawSceneA, drawSceneB)
  // 3. 字幕（カメラの外。揺らさない）
  // 4. 仕上げ：lightLeak → vignette → grain
}
\`\`\`

## 背景のルール
- **背景は1フレームも止めない**。土台（mesh）＋動く要素（bokeh / floaters / stripes など）を必ず重ねる
- シーンが変わったら、背景の配色か種類も変える（同じ背景のまま文字だけ変えない）
- 驚き・オチ・ランキング上位などの山場では、背景ごと演出する（speedLines・rays・flash・burst）
- 強調語が読まれる瞬間に、カメラのズームパンチ（\`zoom: 1 + 0.06*K.punch(t, [強調語の時刻], 0.35)\`）と小さな shake を入れる`;

/** キャラの振り付けルール（キャラを出すときに足す） */
export const CHARACTER_CHOREO_PROMPT = `## キャラの振り付け（動きが少ないと一気に安っぽくなる）
- キャラの位置・大きさ・向きは \`K.keys\` でシーンごとにキーフレームを打つ。**2秒以上同じ場所・同じ大きさで立たせない**
- 1シーンに最低1回は「アクション」を入れる：歩いて登場（walk）、ジャンプ（K.hop や react:"jump"）、驚いてのけぞる（react:"shock"）、うなずく（react:"nod"）、首を振る（react:"shake"）、着地のつぶれ（react:"bounce"）、ポーズの切り替え
- 動きには理由をつける：文字が叩きつけられたら shock、正解が出たら jump＋cheer、問いかけで think、オチで smug＋hip
- 画面の端から歩いて入る・ジャンプして画面の外へ消える・画面の下から顔を出す・アップで画面いっぱいに寄る、など出入りを演出する
- 話している間は energy 1.4〜1.8 で体を大きく動かし、聞かせる場面は 1.0 前後に落とす
- **キャラと文字を重ねない**：キャラが占める範囲は、おおよそ 横 x−size×0.32〜x+size×0.32、縦 y−size（耳の先）〜y（足元）。ジャンプ（hop・react:"jump"）では size×0.13 ほど上に伸びる。文字はこの範囲の外（上・横）に置き、キャラを大きく映すシーンでは文字を画面の上 1/3 にまとめる
- キャラも K.camera の中に置く（カメラのズーム・揺れと一緒に動く）。カメラが寄るときはキャラも一緒に大きくなる`;

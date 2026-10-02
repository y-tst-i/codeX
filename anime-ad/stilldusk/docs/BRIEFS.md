# BRIEFS — 実装担当への指示(場面ごと)

共通: 基準ディレクトリ `B=/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/fps`。先に `B/docs/BIBLE.md` を全部読む。辞書は `python3 /home/user/codeX/claude-video-skill/tools/cin.py <slug>` で1項目ずつ。部品は `tools/assets/scene-lib.js`(mulberry32・timeRemap・project・vignette 等)と `puppet.js`。1920x1080/30fps/無音、フレーム数は ffprobe で厳守。完了報告に f0・最終フレーム・合図フレームの PNG パスを付ける。

## s1_hatch
- 60f(G0–59)/ プロジェクト `B/work/s1_hatch/` → 出力 `B/out/s1_hatch.mp4`
- 読む: SCENES.md「### s1_hatch」全部。合図 G24/G36/G42/G54。
- 辞書: `camera-movement/handheld` `lighting/low-key` `effects/light-flash`
- つなぎ: f0=黒 #0E0D0C に縦の隙間 x=960・y200–880・幅2px・#FFD9A0。最終 L57–59=全面 #FFF1DC(純白 #FFF は不可)。
- 要点: 扉は L36 に割れる(power4.out)、手・HUD・文字なし、非常灯 #C2341B は (260,110)。

## s2_drop
- 72f(G60–131)/ `B/work/s2_drop/` → `B/out/s2_drop.mp4`
- 読む: SCENES.md「### s2_drop」全部。合図 L12/L36/L48/L60(=G72/G96/G108/G120)。
- 辞書: `camera-angles/birds-eye` `camera-movement/crash-zoom-in`
- つなぎ: L0–1=全面 #FFF1DC → L2–14 で抜ける。最終 L71=全面 #C9772E、中心 (960,500) r360 に #E8A65A。
- 要点: 人物は平面図用の形で常に (960,500)、影との距離が高度。着地点はリングの影の帯の中。クラッシュズームは L48–57 の10fだけ、後は静止。

## s3_stalk
- 96f(G132–227)/ `B/work/s3_stalk/` → `B/out/s3_stalk.mp4`
- 読む: SCENES.md「### s3_stalk」全部。足音 L24/36/48/60/72、敵 L36、クロスヘア L66、停止 L78、バイザー L90。
- 辞書: `camera-angles/pov` `composition/one-point-perspective` `lighting/volumetric-light` `atmosphere/dust-storm` `camera-movement/dolly-in`
- つなぎ: L0 は s2 最終と同じ絵(#C9772E+中心 (960,500) の #E8A65A)。最終 L95=VP (960,500) の太陽の前に敵、胸 (960,540) にクロスヘア 8px、バイザー (960,505) CYAN 50%。
- 要点: クロスヘアは中心固定・4本線のみ。敵は puppet.js のシルエット(顔なし)。銃身は架空の形、右下。

## s4_shot
- 132f(G228–359)/ `B/work/s4_shot/` → `B/out/s4_shot.mp4`
- 読む: SCENES.md「### s4_shot」全部(特に「時間」の率表と弾の x 座標表)。命中 L102。
- 辞書: `editing/smash-cut` `time-and-motion/speed-ramp` `time-and-motion/slow-motion` `time-and-motion/motion-blur` `effects/chromatic-aberration` `editing/flash-cut`
- つなぎ: L0=黒地に銃口 (180,540) の CYAN 閃光(s3 の琥珀から全反転)。最終 L131=ほぼ全面 #0E0D0C、(1480,520) r120 内に残り火 ≦0.15。
- 要点: 速度は timeRemap で s(t) を出し、砂粒は閉形式。マッハコーン半角30°。色収差は L0–5 のみ。挿入 L102–104 はバイザーのひび。白の全面フラッシュ禁止。

## s5_title
- 90f(G360–449)/ `B/work/s5_title/` → `B/out/s5_title.mp4`
- 読む: SCENES.md「### s5_title」全部。隙間 L2、扉 L12–29、タイトル L24、COMING SOON L48、静止 L60–89。
- 辞書: `composition/symmetry` `lighting/backlight` `effects/vignette`
- つなぎ: L0=純 #0E0D0C。L2 の縦の隙間は s1 f0 と同一(x=960・y200–880・2px・#FFD9A0)。
- 要点: 文字は `STILLDUSK`(中心 (960,800)、Noto Sans JP Black 132px、字間0.28em)と `COMING SOON`(中心 (960,905)、30px、#D9822B)の2つだけ。カメラ固定、CYAN 禁止、ビネット α0.35。

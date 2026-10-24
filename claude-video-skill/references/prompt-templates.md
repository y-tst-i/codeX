# プロンプト雛形集

出典は Skillry「Opus 5.5 videos」ギャラリー(https://skillry.dev/ai-videos/opus-5-5)の投稿者共有プロンプト。
`{{...}}` は差し替える。作者が「一部のみ共有」と明記しているものは、途中までしか分かっていない。

---

## A. ショーリール / 最小プロンプト(15秒)

複数の投稿者が「同じ1行」で再現している定番。ポイントは**この後ろにプロジェクト参照を足すこと**。

```
/hyperframes make a dynamic 15-second motion graphics video that shows what an incredible
motion designer you are, like it's your showreel for a résumé. go all out.
Use the full context of this project folder.
```

手順: ①hyperframesスキルを入れる → ②上のプロンプト → ③プロジェクトフォルダを参照させる → ④待つ。
実績: Opus 5.5 effort max、約5分、Max 5時間枠の約5%(自己申告)。

---

## B. プロダクト紹介 15秒(1発で通る型)

投稿者 @ik_builds(Opus 5.5 medium)。「見積もり$3,000の案件が1プロンプトで出た」と報告。

```
Create a 15s motion-graphics film explaining {{PRODUCT}}. HyperFrames + GSAP, no voiceover, no footage.
Style: paper-light canvas, marker notes that draw on, real physics, huge kinetic type,
hard light/dark switches, a new idea every 1.5–2 s, a sound on every hit.

COPY: read {{POSITIONING_DOCS}} first. {{ONE_LINER}} For {{AUDIENCE}}. {{WHAT_IT_DOES}}
Name what the product learns, never the abstraction.

RULES
- No chrome (scrubber, timecode, fps, headers). No animator jargon on screen
  ("squash", "stagger", "easing"...). Every word speaks to the buyer.
- No invented results: no %, multipliers, customer names or figures.
- Never use: {{BANNED_WORDS}}.
- Logo: real mark {{LOGO_FILE}} + "{{PRODUCT}}" in {{WORDMARK_FONT}}; never a boxed logo file.

CRAFT
- Colours {{COLOR_CANVAS}} / {{COLOR_INK}} / {{COLOR_ACCENT_1}} / {{COLOR_ACCENT_2}}; notes in the
  accents; dark mode = charcoal matching the palette.
- Fonts {{BRAND_FONTS}}; Anton for kinetic type; Caveat handwriting via stroke-dashoffset.
- Real easing, squash/stretch, stagger, overlap, onion skin, smear, follow-through. Check the
  HyperFrames registry first. Set every from-state at t=0 (seek-safe); never cover an exit.
  One primary move per transition; no generic push/slide/rotate-swing.
- Music in sections: drums drop on the dark switch and while the ball is airborne, slam back
  on the type and the logo. SFX: pops, pen scribbles, whooshes, logo sub-hit. CC0 or generated
  only; log sources. Master -14 LUFS, -2 dBTP, re-measured after AAC encode.
```

転用のコツ: `Style:` と `CRAFT` の演出語彙(紙+マーカー+物理)を自分の世界観に置換する。`RULES` はほぼそのまま使える。

---

## C. ポッドキャスト/トーク動画に全画面アニメを大量挿入

投稿者 @stokebuilder。35〜50個を生成。**作者共有はプロンプトの一部**。

```
Go through the entire [episode] cut and add full-screen animations and graphics wherever they help.
Be aggressive and over-inclusive: 35–50 moments, at least 2 per chapter. The goal is to fill empty
talking-head time, explain ideas, and create visual hooks.

Style. Pick an aesthetic that's genuinely interesting and very, very cool, built in JavaScript
with HyperFrames and assembled in {{EDITOR/ASSEMBLY TOOL}}. Inspiration (all JS, no image assets):
{{REF_1: paper, typewriter-tape labels, hand-drawn marks}}
{{REF_2: halftone, manga and pixel print, kinetic data type}}
Stay inside the {{BRAND}} brand (read brands/{{brand}}/): {{palette}}, {{font}}, and the supplied
lockup top-right, static. Write a shared style bible and a component kit first, so every
animation looks like the same show.

Moments I definitely want:
[LIST]

Rules
- Whenever anything goes full-screen (animation, screen share or still), one of us is in a corner
  picture-in-picture, bottom-right, following whoever is talking.
- No punch-ins or zooming on the cameras. Keep each speaker relatively centered.
- Copy must be verbatim or faithful to what's said. Never invent facts, numbers or quotes.
- Sync each animation's beats to the spoken words.
- Keep each graphic inside one uncut stretch of audio, and leave a few seconds of faces between graphics.

Process
- An Opus 5.5 agent at extra-high effort finds every timestamp where an animation could fill space
  and hook the viewer, with a concept for each.
- Opus 5.5 at medium effort builds each animation.
- Opus 5.5 at extra-high effort judges each one once on brand consistency with the others, visual
  interest, relevance to the narrative and creative judgment.
- Only cues the judge considers egregiously bad go back for a fix. No blanket redo loops.
- Assemble the full cut with PiP baked into every full-screen visual, and give me a folder of the
  individual animations.
```

Claude Code で再現するなら、企画役・制作役・審査役をサブエージェント(Agent ツール)に分けて並列化する。

---

## D. 公式の最小例(HyperFrames README)

```
Using /hyperframes, create a 10-second product intro with a fade-in title, a background video,
and subtle background music.
```

---

## E. 自分用に育てるときのテンプレ

```
Create a {{N}}s {{種類: launch film / explainer / reel}} for {{対象}}.
HyperFrames + GSAP. {{ナレーション有無}}. {{素材: 実画面/実データ/ロゴ}} は {{パス}} から使う。
Style: {{配色}} / {{フォント}} / {{動きの語彙}} / {{切替テンポ}}.
Rules: 画面クローム無し、捏造した数値無し、禁止語 {{...}}、ロゴは実ファイル。
Audio: {{BGM源}} / {{SFXの着地点}} / {{ナレーションTTS}}、-14 LUFS。
Process: まず10〜15秒版を作り、npx hyperframes check と snapshot で自己検証 → preview を見せる。
         承認後にだけ render。
```

---

## F. 数値で指示する型(Opus 5.5 Motion Lab)

出典: Florence(@flxrnc)の X 記事と CTRL+Z の配布資料。考え方・数値表・作例は `motion-lab.md`。
形容詞を数値に置き換え、定番を名指しで禁止する。BRAND だけ差し替えれば他の行は使い回せる。

```
GOAL: {{見た人に何を感じさせるか・させるか、1文}}
OUTPUT: one self-contained HTML file, {{three.js 0.181.2 / Canvas 2D / HyperFrames}}, {{W}}x{{H}}.
TIME: {{秒}} s x {{fps}} fps = {{総コマ}} frames, {{seamless loop / no loop}}, {{BPM}} BPM (1 beat = {{fps*60/BPM}} frames). Hits land on beats.
BRAND: HERO {{主役の形・色(hex)・顔}} / SET {{舞台}} / ACCENT {{アクセント色の物}} / SCREEN TEXT {{画面の文字}} / PALETTE {{hex を列挙}}
MODEL (3D): {{1 unit = 1 cm、寸法、面取り、素材: roughness / clearcoat / metalness}}
LOOK: {{key/fill/rim の位置・色温度・強さ}}, contact shadows, bloom on {{光らせる物}} only. Post: {{grain %, vignette %}}.
MOTION: ease enter cubic-bezier(0.16,1,0.3,1), move (0.76,0,0.24,1), exit (0.7,0,0.84,0); springs at damping ratio {{0.7}}; anticipation {{n}} frames, squash {{1.25x0.7}}, stretch {{0.85x1.28}}, limbs lag {{4/6}} frames.
BEATS (s): {{0 …}} / {{2 …}} / {{…}} / {{最後: 0コマ目へつながる動き}}
CAMERA: {{画角}} lens, {{各拍での仕事}}; never parks; end camera = start camera.
BANNED: purple or blue gradients, glow orbs, neon, lens flares, decorative particles, spinning turntables, made-up text, everything fading in at once, fade-and-slide-up on every element, {{1回目で出た定番}}.
CHECKS: renderAt(t) draws exactly time t, seeded random only. Stills around every hit. {{触れてはいけない物同士}} never touch; {{接地}}; frame N-1 flows into frame 0 in pose and velocity; text readable at phone size.

Render contract: (motion-lab.md §2 の8行をそのまま貼る)
```

追加指示は「コマ番号+見えた物+数値」で、1回に1〜2個。例: 「外側の滴が112コマ目で8px はみ出す。滴を文字位置の40%から出して、7%の行き過ぎを1.97秒に」。音は別の指示書で、同じ合図表(コマ番号)から作る(`motion-lab.md` §8)。

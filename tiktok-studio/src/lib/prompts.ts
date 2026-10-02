import { FONTS, GOALS, HOOKS, PALETTES, STYLES, VIDEO, findOrFirst } from "./knowledge";
import { characterPromptSection, type CharacterSettings } from "./character";
import { CHARACTER_CHOREO_PROMPT, MGK_PROMPT } from "./mgKitDocs";
import { EASING_LIBRARY, resolveTechniques } from "./techniques";
import { formatTimelineForPrompt } from "./timeline";
import type { Concept, Script, Timeline } from "./types";

/* ------------------------------------------------------------------ */
/* 台本プロンプト                                                        */
/* ------------------------------------------------------------------ */

export function scriptSystemPrompt(): string {
  return [
    "あなたは日本のTikTokで数百万回再生を連発している、ショート動画専門の構成作家です。",
    "視聴者が最初の1秒で指を止め、最後まで見て、もう一度見たくなる台本を書きます。",
    "事実の正確さを大切にし、確証のない数字や断定は使いません。"
  ].join("\n");
}

/** この動画に看板キャラを出すか */
export function characterFor(concept: Concept, character: CharacterSettings | undefined): CharacterSettings | undefined {
  return character && concept.useCharacter !== false ? character : undefined;
}

export function buildScriptPrompt(concept: Concept, character?: CharacterSettings): string {
  const hook = findOrFirst(HOOKS, concept.hookId);
  const style = findOrFirst(STYLES, concept.styleId);
  const goal = GOALS[concept.goal] ?? GOALS.follow!;
  const charBudget = Math.round(concept.durationSec * VIDEO.charsPerSecond * 0.92);
  const sceneCount = Math.max(4, Math.round(concept.durationSec / 3));

  return `# 依頼
TikTok用の縦型ショート動画（モーショングラフィックス＋AIナレーション）の台本を作ってください。

# 動画の前提
- アカウントのジャンル: ${concept.niche || "（未設定）"}
- ターゲット: ${concept.target || "（未設定）"}
- 今回のテーマ: ${concept.topic}
${concept.notes.trim() ? `- 参考情報（事実はここを優先）:\n${indent(concept.notes.trim())}` : ""}
- 目標尺: ${concept.durationSec}秒（セリフ合計はおよそ${charBudget}文字。記号を除く）
- シーン数の目安: ${sceneCount}前後（1シーン2〜4秒）
- 語り口: ${concept.tone || "テンポよく親しみやすい"}
- 映像スタイル: ${style.name}（${style.summary}）
- 動画のゴール: 視聴者に「${goal.label}」してもらう → ${goal.cta}${character ? `\n- 語り手: 看板キャラ「${character.name}」（${character.concept}）が視聴者に話しかけている体で書く。キャラらしい口調・決めゼリフがあると覚えてもらいやすい` : ""}

# フック（最重要）
- 型: 「${hook.name}」= ${hook.formula}
- 例: ${hook.example}
- 1文目は声に出して1.5秒以内（11文字前後）で言い切る。挨拶・自己紹介・「今回は」「皆さん」は禁止
- 1文目で「答えを知りたい」という疑問（情報の空白）を作り、答えは後半まで引っ張る

# 構成ルール
1. hook → body（2〜3秒ごとに新しい情報）→ twist（「でも実は」の意外な展開）→ cta → loop の流れ
2. 話し言葉・短文。1文20文字以内。体言止めや問いかけでリズムを作る
3. 具体的な数字・固有名詞で信頼感を出す。ただし不確かな情報は「〜と言われています」とする
4. ctaは押しつけがましくなく一言で。「${goal.label}」につながる理由を添える
5. 最後のloopシーンのセリフは、動画の1文目に自然につながる言い回しにする（ループ再生で2周目に入りやすくする）
6. 各シーンの onScreenText は12文字以内。セリフの要点を一撃で伝える言葉（セリフの丸写しは避ける）
7. emphasis にはセリフ中で色や動きで叩くべき語句を1〜2個
8. visual には「${style.name}」の世界観で、そのシーンの具体的な動き（何が・どう動くか）を書く
9. reading はTTSに読ませる文。読み間違えやすい漢字・固有名詞・単位だけひらがな/カタカナに開き、それ以外はnarrationと同じにする
10. caption は検索されやすいキーワードを自然に含む1〜2文＋コメントしたくなる問いかけ
11. hashtags はジャンルを表す具体的なタグ中心に3〜5個（#fyp や #おすすめ のような汎用タグは不要）
12. coverText はプロフィール一覧で並んでも目を引く12文字以内

# 出力形式
次の形のJSONだけを出力してください（前置き・説明は不要）。
{
  "title": "管理用タイトル",
  "caption": "投稿文",
  "hashtags": ["#タグ1", "#タグ2", "#タグ3"],
  "coverText": "カバー用の一言",
  "scenes": [
    {
      "role": "hook | body | twist | cta | loop",
      "narration": "セリフ（字幕表記）",
      "reading": "読み上げ用のセリフ",
      "onScreenText": "画面の大きな文字",
      "visual": "映像演出",
      "emphasis": ["強調語"]
    }
  ]
}`;
}

/* ------------------------------------------------------------------ */
/* モーショングラフィックス生成プロンプト                                   */
/* ------------------------------------------------------------------ */

export function motionSystemPrompt(): string {
  return [
    "あなたは世界トップクラスのモーションデザイナー兼クリエイティブコーダーです。",
    "Buck、ManvsMachine、日本のMV制作会社レベルの、タイミング・イージング・構図・タイポグラフィにこだわり抜いた映像を、",
    "HTML Canvas 2D だけで実装します。見た人が『これどうやって作ったの？』と思うクオリティを目指してください。"
  ].join("\n");
}

export interface MotionPromptInput {
  concept: Concept;
  script: Script;
  timeline: Timeline;
  /** 登場させる看板キャラ（なければ出さない） */
  character?: CharacterSettings;
  /** 使える素材（背景画像・小物・Lottie）の説明。無ければ空 */
  assets?: string;
}

export function buildMotionPrompt({ concept, script, timeline, character, assets }: MotionPromptInput): string {
  const style = findOrFirst(STYLES, concept.styleId);
  const palette = findOrFirst(PALETTES, concept.paletteId);
  const font = findOrFirst(FONTS, concept.fontId);
  const duration = timeline.duration.toFixed(3);
  const { safe } = VIDEO;
  const fontUrl = googleFontsUrl(font.family, font.weights);
  const heaviest = Math.max(...font.weights);
  const { techniques, auto } = resolveTechniques(concept.styleId, concept.techniqueIds);
  const techniqueLines = techniques.map((t) => `- **${t.name}**（${t.when}）: ${t.recipe}`).join("\n");

  return `# 依頼
下のタイムラインに完全同期する、TikTok用の縦型モーショングラフィックス動画を、1つのHTMLファイルとして実装してください。
ナレーション音声は別で用意済みです（HTML内で音は鳴らしません）。映像だけを作ります。

# 作品情報
- タイトル: ${script.title}
- ジャンル/ターゲット: ${concept.niche} ／ ${concept.target}
- 総尺: ${duration}秒 ／ ${timeline.fps}fps ／ ${VIDEO.width}×${VIDEO.height}px（9:16）

# アートディレクション
## スタイル: ${style.name}
${style.summary}
${style.direction.map((line) => `- ${line}`).join("\n")}

## カラーパレット（これ以外の色は明度違い程度に留める）
- 背景: ${palette.colors.bg}
- 面・カード: ${palette.colors.surface}
- 文字: ${palette.colors.text}
- アクセント1（強調語・重要な動き）: ${palette.colors.accent}
- アクセント2（補助）: ${palette.colors.accent2}

## フォント
- 「${font.family}」（ウェイト ${font.weights.join(" / ")}）をGoogle Fontsから読み込む
- 読み込みURL: ${fontUrl}
- 見出し・キーワードは ${heaviest}、字幕は ${font.weights[0]} 以上

## 使う演出テクニック${auto ? "（スタイルに合わせたおすすめ。シーンに合うものを選んで使う）" : "（指定。最低1回ずつ、効果的な場面で使う）"}
${techniqueLines}

## イージング辞典（この式で実装する）
${EASING_LIBRARY.map((line) => `- ${line}`).join("\n")}

${MGK_PROMPT}

${assets ? `${assets}\n\n` : ""}${character ? `${characterPromptSection(character)}\n\n${CHARACTER_CHOREO_PROMPT}\n\n` : ""}# タイムライン（音声の実測値。1フレームもずらさないこと）
${formatTimelineForPrompt(timeline)}

# モーションの原則（全部守る）
1. **0フレーム目から画が完成している**: 黒からのフェードイン禁止。t=0の時点でフックの文字と主役のビジュアルが見えていて、すでに動いている
2. **最初の1秒が勝負**: 0〜1秒の間に大きな動き（ズームパンチ・叩きつけ・画面を割る等）を必ず入れる
3. **静止画面を作らない**: どの瞬間もカメラのゆっくりしたドリフト/ズーム、背景要素の揺らぎなど、何かが動いている
4. **1.5〜3秒ごとに視覚的な変化**（パターンインタラプト）: レイアウト・スケール・色面・カメラ位置のどれかを大きく変える
5. **イージング**: linearは連続運動（回転・流れ）にだけ使う。登場は easeOutExpo / easeOutBack / spring、退場は easeInCubic で素早く。大きな動きの前には easeInBack の溜めを入れる
5-2. **物理は式で**: 重力・減衰・バネは「経過時間 s の式」で位置を出す（\`v *= 0.98\` のようにフレームごとに状態を更新する書き方は禁止。書き出しでは任意の時刻を直接描くため）
5-3. **光で主役を立てる**: 暗い背景では発光（'lighter' 合成や shadowBlur を控えめに）で主役と背景のコントラストを作る
6. **アニメーションの12原則**: 予備動作（anticipation）、オーバーシュート、フォロースルー、スタッガー（30〜60ms）、二次的な動き
7. **音との同期**: 各シーンの主役の登場は speechStart の0〜2フレーム前。強調語は、その語が読まれる字幕チャンクの開始時刻に叩く
8. **シーン転換**: シーン境界（前シーンのend）をまたいで6〜10フレームの転換をつくる。カットでつなぐだけにしない（マッチカット・ズームスルー・マスクワイプ・ホイップパン等）
9. **階層**: 1画面の主役は1つ。onScreenText が主役、字幕は脇役
10. **質感**: 必要に応じて微細なノイズ/グレイン、影、奥行き（パララックス）で「安っぽいスライド」感を消す
11. **ループ**: 最後の${VIDEO.tail}秒で、画面を t=0 の構図へ自然につなぐ（ループ再生時に継ぎ目が分からないように）

# 映像の文法（プロの広告映像から抽出された6つのルール）
1. **前景が転換になる**: 見出しや図形がカメラを突き抜けて拡大し、その下に次のシーンがすでに置かれている。シーンとシーンの間に空白を作らない
2. **主役を引き継ぐ**: 1つの物体（カード・図形・キーワード・線）が形を変えながら複数シーンを渡り歩く。無関係な登場の連続はスライドショーに見える。引き継ぐ物体は、前シーンの最後のフレームと次シーンの最初のフレームで**同じ座標・同じ大きさ**にする
3. **動きの階層**: 主役の大きな動き1つ＋補助要素のスタッガー＋細かいディテール（光の走り・小さな記号）を重ねる。毎ビートで画面全体を止めてから動かさない
4. **速度を変える**: 読める位置に着地（減速）→ 読ませる → 素早く退場。一定速度で漂わせない
5. **カットも使える**: 被写体・大きさ・方向・質感がそろっていれば、ハードカットでもよい（カット後も動きを続ける）
6. **原因→結果で見せる**: スキャンすると結果が出る、ボタンを押すと状態が変わる、のように、動きが何かを生み出すようにする

# 構図とテンポ
- 主役はセーフエリアの **60〜85%** を占める大きさにする。小さなカードが広い余白に浮かぶ画は安っぽく見える
- 同時に読ませるものは1〜2個まで
- 構図の種類を変える：大きな文字のインパクト／図解の俯瞰／寄りのアップ／奥行きのある引き。「見出し＋カード3枚」を繰り返さない
- 文字は振り付けの一部：大きな単語が逆方向から入る、次のシーンをマスクで見せる。退場する見出しは、次の見出しが入る**前に**消える（2つの見出しを重ねない）
- **0.6秒を超えて止まる瞬間を作らない**（読ませる場面でも3〜5%のゆっくりしたズームを続ける）

# 字幕（焼き込み）
- 字幕は **\`K.caption(ctx, t, { style: "karaoke", y: ${safe.bottom - 140}, size: 64, family: "${font.family}", highlight: アクセント色, accentColor: アクセント2 })\`** を render の最後（仕上げの前、カメラの外）で毎フレーム呼ぶだけでよい。字幕の文字と時刻（タイムラインの「字幕」と同じもの）はツールが \`window.MG_CAPTIONS\` として用意し、読まれている文字から順に色が変わるカラオケ字幕になる。強調語は自動でアクセント色
- style は "karaoke"（標準）/ "pop"（読まれる文字が弾んで出る。テンポの速い動画向き）/ "plain"。動画全体で1つに統一する
- 字幕の位置は y=${safe.bottom - 260}〜${safe.bottom} の固定ゾーン。キャラや主役の文字をこのゾーンに置かない（キャラの足元が字幕にかかるなら、キャラを上げるか字幕を y=${safe.top + 120} 付近に上げる）

# TikTokのセーフエリア（厳守）
- 重要な文字・顔になる要素はすべて x=${safe.left}〜${safe.right}, y=${safe.top}〜${safe.bottom} の中に置く
- 右端（x>${safe.right}）はいいね等のボタン、下部（y>${safe.bottom}）は投稿文、上部（y<${safe.top}）はタブで隠れる。背景や装飾ははみ出してよい

# 技術仕様（この契約を破ると書き出しできません）
- 1つのHTMLファイル。外部読み込みは Google Fonts のみ（画像・ライブラリ・CDNは使わない。図形・アイコンはCanvasで描く）。window.MGK・window.CHARACTER・window.MG_VOICE_LEVEL はツールが用意するので、そのまま使う
- \`<canvas id="stage" width="${VIDEO.width}" height="${VIDEO.height}">\` に Canvas 2D で描画する（DOM要素・CSSアニメーション・SVGで映像を作らない）
- グローバルに次のオブジェクトを公開する:
\`\`\`js
window.MG = {
  width: ${VIDEO.width},
  height: ${VIDEO.height},
  fps: ${timeline.fps},
  duration: ${duration},
  ready,          // Promise。フォント読み込みと事前計算が終わったら resolve
  render(t) {},   // 時刻 t 秒の1フレームを描く（下記ルール）
  sfx: [ ... ]    // 効果音の指定（上の「効果音の指定」）
};
\`\`\`
- **render(t) は純粋関数**: 同じ t なら何度呼んでも、どんな順番で呼んでも同じ絵になる。前フレームの状態・経過時間・\`Date.now()\`・\`performance.now()\`・\`Math.random()\` に依存しない。乱数が要るならシード付きPRNG（mulberry32など）を初期化時に使い、結果を配列に保存しておく
- render(t) の最初で必ず全面を塗りつぶす（前フレームの残像を残さない）。\`ctx.save()/restore()\` の対応を崩さない
- 1フレームの描画は16ms以内を目安に（\`shadowBlur\` や \`ctx.filter\` の多用を避け、重いテクスチャは初期化時にオフスクリーンcanvasへ事前描画）
- **日本語フォントの読み込み**: Google Fontsの日本語は文字ごとに分割配信されるため、動画内で使う全文字列を連結した \`ALL_TEXT\` を作り、使う各ウェイトについて \`document.fonts.load('<weight> 100px "${font.family}"', ALL_TEXT)\` を await してから \`ready\` を resolve する。ネットワークの失敗でフォントが読めなくても \`ready\` は reject させず（catchして）resolve する
- 日本語の自動改行は measureText で1文字ずつ詰め、句読点・閉じ括弧・小書き文字（、。」』ゃゅょっー等）が行頭に来ないようにする
- 自動再生: \`window.__MG_HOST__\` が true でないときだけ、ready 後に requestAnimationFrame で t を進めてループ再生する（単体でブラウザで開いたときの確認用）
- 画面表示: html/body は余白なし・背景黒、canvas はウィンドウの高さに合わせて 9:16 のまま中央に表示（CSSの見た目の縮小のみ。canvasの内部解像度は変えない）

# 実装の進め方
1. まず全シーンの絵コンテを表にする（出力形式を参照）。「エフェクト名を使わずに説明できる見せ場の変身」を3つ決める（例：『？マークが割れて答えのカードになる』）
2. 補間・イージング・文字・背景・転換は window.MGK を使う（自前で書かない）。シーンごとの背景の組み合わせと、カメラの動き（寄り・引き・パンチ）を表にしてから書く
3. シーンごとに \`drawSceneN(ctx, localT)\` を作り、render(t) で時刻に応じて呼び分け、転換区間は2シーンを合成する
4. 字幕レイヤー → 仕上げ（K.fx.lightLeak → K.fx.vignette → K.fx.grain）の順に重ねる

# 提出前セルフチェック（すべてYesになるまで直す）
- [ ] t=0 で黒画面ではなく、フックの文字が読める
- [ ] 全シーンの主役の登場が speechStart に合っている
- [ ] 字幕はタイムラインの時刻どおり、セーフエリア内
- [ ] 0.6秒以上まったく動かない瞬間がない
- [ ] 背景が全シーンで動いていて、シーンごとに配色か種類が変わる${assets ? "\n- [ ] 「素材のセルフチェック」をすべて満たしている（全シーンで背景画像を使っている）" : ""}
- [ ] カメラが常に動いていて、強調語でズームパンチが入る${character ? "\n- [ ] キャラが2秒以上同じ場所・大きさで止まらず、各シーンに1回以上アクションがある" : ""}
- [ ] 転換の途中で文字どうしが重なったり、文字が別の文字を横切ったりしない
- [ ] 主役がセーフエリアの60〜85%の大きさで、余白が寂しくない
- [ ] 少なくとも1つの物体が、シーンをまたいで引き継がれている
- [ ] 最後から最初へのループがなめらか
- [ ] render(t) は Math.random / Date.now / performance.now / 前フレームの状態を使っていない
- [ ] 外部読み込みは Google Fonts だけ
- [ ] window.MG の全プロパティ（sfx を含む）がそろっていて、効果音の時刻が映像の動きと合っている

# 出力形式
1. 最初に**絵コンテ表**を書く（列：時刻｜画面に見えるもの｜背景（${assets ? "使う背景画像の名前と、上に重ねるMGKの効果" : "MGKのどれ・配色"}）｜カメラ｜${character ? "キャラ（位置・大きさ・表情・ポーズ・アクション）｜" : ""}転換の方法と、次のシーンへ引き継ぐ物体）
2. 見せ場の変身3つを箇条書きで
3. そのあとに完成したHTMLを \`\`\`html コードブロック1つだけで出力する。省略（「…以下同様」等）は禁止です。`;
}

/** 生成済みHTMLをさらに磨き込むための依頼文 */
export function buildPolishPrompt(input: MotionPromptInput, currentHtml: string, request: string): string {
  return `${buildMotionPrompt(input)}

---

# 現在のバージョン
以下は上の仕様で作った現在のHTMLです。

\`\`\`html
${currentHtml}
\`\`\`

# 今回の改善依頼
${request.trim() || "（特になし。ディレクター目線で最も効果の大きい改善をしてください）"}

# 進め方
1. 改善依頼に批評家のレポートが含まれていれば、その指摘をすべて直す（深刻なものから）。含まれていなければ、クリエイティブディレクターとして現在のバージョンの弱点を「フックの強さ」「音との同期」「動きの質（イージング・スタッガー・転換）」「読みやすさ」「質感」「余白と主役の大きさ」の観点で厳しく5つ挙げる
2. それをすべて直した完全版のHTMLを、\`\`\`html コードブロック1つで出力する（技術仕様は必ず守る。省略禁止）`;
}

/**
 * 別のClaudeに「完成した画だけ」を見せて批評させる依頼文。
 * 作った本人に自己採点させない（builder ≠ judge）。コンタクトシート画像と一緒に渡す。
 */
export function buildCriticPrompt(input: MotionPromptInput, measured: { frozenSeconds: number; longStretches: { start: number; end: number }[] } | null): string {
  const { concept, script, timeline } = input;
  const beats = timeline.scenes
    .map((scene) => `- ${scene.start.toFixed(1)}〜${scene.end.toFixed(1)}s（${scene.role}）画面の文字「${scene.onScreenText}」／セリフ「${scene.narration}」`)
    .join("\n");
  const frozen = measured
    ? `- 画が止まっている時間：合計${measured.frozenSeconds.toFixed(1)}秒${measured.longStretches.length ? `（0.6秒以上止まる区間：${measured.longStretches.map((s) => `${s.start.toFixed(1)}〜${s.end.toFixed(1)}s`).join("、")}）` : "（0.6秒以上の停止なし）"}`
    : "- （計測なし）";

  return `あなたは独立した映像批評家です。この映像を作ったのはあなたではありません。意図ではなく、**添付の画像に写っている画だけ**で判断してください。

# 見るもの
添付画像は、TikTok用の縦型動画（${VIDEO.width}×${VIDEO.height}、${timeline.duration.toFixed(1)}秒）を0.5秒ごとに並べたコンタクトシートです。各コマの左上に時刻があります。
- テーマ：${script.title}（ジャンル：${concept.niche}／ターゲット：${concept.target}）
- 狙い：最初の1秒で指を止め、最後まで見てもらい、ループさせる

# 各シーンの予定
${beats}

# 計測値
${frozen}

# 合格ライン
- 0秒のコマが完成した画面になっている（フックの文字が読める、黒画面や半分だけ入った文字ではない）
- 主役がTikTokのセーフエリア（上${VIDEO.safe.top}px・下${VIDEO.height - VIDEO.safe.bottom}px・右${VIDEO.width - VIDEO.safe.right}pxを除いた範囲）の60〜85%を占め、余白が寂しくない
- 文字どうしの重なり・見切れ・読めないコントラストがない
- 構図の種類が変化している（同じレイアウトの繰り返しになっていない）
- シーンをまたいで引き継がれる物体があり、スライドショーに見えない
- 音を消しても、何の話で最後に何をすればいいか分かる
- 素人っぽく見える点（安っぽい配色、中途半端な大きさ、揃っていない余白）がない

# 出力（800字以内、辛口で）
1. 判定：このまま投稿 / もう一回直す
2. 問題点を深刻な順に（時刻と画面の位置つき）
3. 効果が大きい修正を5つ、コードで実装できる具体的な指示として（例：「2.0〜3.5秒のカードを1.4倍にし、左端をx=64にそろえる」）`;
}

/** 検証エラーを直すための依頼文 */
export function buildFixPrompt(currentHtml: string, problems: string[]): string {
  return `次のHTMLモーショングラフィックスを動画に書き出そうとしたところ、問題が見つかりました。

# 見つかった問題
${problems.map((problem) => `- ${problem}`).join("\n")}

# 守るべき契約（再掲）
- <canvas id="stage" width="${VIDEO.width}" height="${VIDEO.height}"> に Canvas 2D で描画
- window.MG = { width, height, fps, duration, ready: Promise, render(t) } を公開
- render(t) は同じ t なら常に同じ絵を描く純粋関数（Math.random / Date.now / performance.now / 前フレームの状態を使わない）
- window.__MG_HOST__ が true のときは自動再生しない
- 外部読み込みは Google Fonts のみ

# 現在のHTML
\`\`\`html
${currentHtml}
\`\`\`

見た目と演出はできるだけ保ったまま問題だけを直し、完全なHTMLを \`\`\`html コードブロック1つで出力してください（省略禁止）。`;
}

export function googleFontsUrl(family: string, weights: number[]): string {
  const name = family.replace(/ /g, "+");
  const sorted = [...weights].sort((a, b) => a - b);
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${sorted.join(";")}&display=block`;
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

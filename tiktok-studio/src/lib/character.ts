import type { Palette } from "./knowledge";

/**
 * アカウントの看板キャラクター。
 * Canvas 2D で描く関数として1回だけデザインし、毎回の動画に同じコードを差し込む
 * （＝毎回まったく同じ見た目で登場する）。口は実際のナレーションの音量で動く。
 */
export interface CharacterSettings {
  name: string;
  concept: string;
  /** window.CHARACTER を定義する JavaScript（<script>の中身） */
  script: string;
}

export const EXPRESSIONS = ["normal", "happy", "surprised", "thinking", "sad", "wink", "smug"] as const;
export const POSES = ["idle", "point", "wave", "cheer", "shrug"] as const;

export const EXPRESSION_LABELS: Record<string, string> = {
  normal: "ふつう",
  happy: "笑顔",
  surprised: "びっくり",
  thinking: "考え中",
  sad: "しょんぼり",
  wink: "ウインク",
  smug: "ドヤ顔"
};
export const POSE_LABELS: Record<string, string> = { idle: "立ち", point: "指さし", wave: "手を振る", cheer: "バンザイ", shrug: "お手上げ" };

export const CHARACTER_PRESETS: { label: string; text: string }[] = [
  { label: "スタイリッシュな擬人化うさぎ", text: "長編アニメ映画に出てくるような、4〜5頭身のスラッとした擬人化うさぎの女の子。色のついた大きな瞳にハイライト2つ、頬の毛がふくらみ鼻先が少し前に出た動物らしい顔立ち、口元と胸元が白い2トーンの毛並み、内側がピンクのグラデーションの長い耳。耳としっぽで感情を表現する、まっすぐで行動力のある頑張り屋。毛はあたたかいキャラメルブラウン、瞳はアンバー（琥珀色）。恋愛カウンセラーらしく、ゆるめのカーディガンにハートのピンバッジ。" },
  { label: "丸いマスコット", text: "まんまるのからだに短い手足がついた、ゆるくてかわいいマスコット。大きな目と小さな口。" },
  { label: "うさぎの先生", text: "恋愛や心理学を教えてくれる、丸メガネをかけたうさぎの先生。少しおませで物知り。" },
  { label: "ねこの相棒", text: "ちょっと生意気だけど憎めない、二頭身のねこ。しっぽで感情を表現する。" },
  { label: "デフォルメの人物", text: "二頭身にデフォルメした、親しみやすい解説役のお姉さん（実在の人物には似せない）。" },
  { label: "ふしぎ生物", text: "ゼリーのようにぷるぷるした、表情豊かなふしぎ生物。感情で色が少し変わる。" }
];

export function buildCharacterPrompt(name: string, concept: string, palette: Palette): string {
  return `# 依頼
TikTokの縦型モーショングラフィックス動画に毎回登場する「看板キャラクター」を、**HTML Canvas 2D の描画コード**としてデザインしてください。
このコードは今後すべての動画にそのまま差し込まれ、表情・ポーズ・口の開き具合を変えながら使われます。

# キャラクター
- 名前: ${name || "（未定。似合う名前を考えて）"}
- イメージ: ${concept}
- アカウントの配色（キャラはこの世界観になじむ色で。背景は ${palette.colors.bg}、アクセント ${palette.colors.accent} / ${palette.colors.accent2}）

# デザインの条件
- 縦型動画の中で小さく表示されても判別できる、**シルエットがはっきりした、シンプルで記憶に残る形**
- 表情が大きく伝わる顔（目・眉・口で感情を出す）
- 有名作品の「雰囲気・ジャンル・デザインの良さ」を参考にするのはよいが、特定の既存キャラだと分かる特徴の組み合わせ（毛色・目の色・衣装・顔立ちのセット）や名前は再現しない。毛色・目の色・服で別のキャラとして成立させる
- **「プロのキャラクターデザイン」に見える仕上げ**（コードで描くと「丸と棒の組み合わせ」の安っぽいクリップアートになりがちなので、ここに一番こだわる）:
  - 形は円・楕円・直線の組み合わせで済ませず、ベジェ曲線で有機的なラインを描く（頬のふくらみ、首から肩、腰のくびれ、太もも・ふくらはぎ、ひじ、手の指）。手足を直線の棒にしない
  - 動物キャラなら顔は円にせず、頬の毛のふくらみや鼻先など、その動物らしい輪郭にする
  - 塗りは平塗りにしない：各パーツに createLinearGradient / createRadialGradient で光源（左上）からの陰影をつけ、輪郭の内側に細いリムライト（明るい縁）を入れる
  - 主線は均一にしない：外側の輪郭は太く（サイズ1000pxのとき6〜9px）、内側の線（口・眉・服のしわ）は細く。主線の色は真っ黒でなく、地の色を暗くした色
  - 目は大きく、「白目・色のついた虹彩（グラデーション）・瞳孔・大小2つのハイライト・上まぶたの影」の層で描く
  - 頭身・重心・シルエットで魅力を出す（立ちポーズでも少し腰をひねり、片足に重心をかける）
- **目の表情**：表情ごとに形を変える（笑顔は弧、驚きは大きく丸く、ジト目など）。look で瞳が左右に動く
- **口パクの質（最重要）**：mouth の値で口の形を段階的に変える。0＝閉じた口（表情ごとの形）、0.3前後＝小さく開く、0.6前後＝「あ」の形で舌や口内が見える、1＝大きく開く。値が少し変わっただけでカクカクしないよう、開き具合はなめらかに補間する
- **体の演技**：頭・耳・しっぽ・手など、キャラの特徴的なパーツを t でわずかに揺らし、立っているだけでも生きて見えるようにする

# 技術仕様（この契約どおりに作る）
\`<script id="character">\` の中に、次のグローバルを定義するコードを書く。外部ライブラリ・画像は使わず、Canvas 2D のパスと図形だけで描く。

\`\`\`js
window.CHARACTER = {
  name: "キャラの名前",
  expressions: ["normal", "happy", "surprised", "thinking", "sad", "wink", "smug"],
  poses: ["idle", "point", "wave", "cheer", "shrug"],
  /**
   * キャラを1体描く。
   * x, y: 足元の中心の座標 / size: 身長(px) / t: 秒（瞬き・呼吸の揺れに使う）
   * expression: 上の表情のどれか / pose: 上のポーズのどれか
   * mouth: 0〜1 の口の開き（ナレーションの音量に合わせて外から渡される）
   * look: -1〜1 の視線（左右） / flip: true なら左右反転
   */
  draw(ctx, { x, y, size, t = 0, expression = "normal", pose = "idle", mouth = 0, look = 0, flip = false }) {}
};
\`\`\`

- **draw は純粋関数**：同じ引数なら必ず同じ絵。Math.random・Date.now・前回の状態を使わない
- 瞬きは t から決める（例：(t % 3.7) < 0.12 のとき目を閉じる）。呼吸のわずかな上下も t の sin で
- draw の中で ctx.save()/restore() を必ず対にし、呼び出し側の状態を汚さない
- 指さし（point）は画面の右上方向を指す。flip で左右反転できる
- mouth が 0 なら口を閉じ、1 で最大に開く（表情ごとの口の形を保ったまま開閉させる）

# 確認用の表示
同じHTMLの中に \`<canvas id="sheet" width="1400" height="1000">\` を置き、全表情（上段）と全ポーズ（下段）を並べて描き、それぞれの下に名前を書く。

# 出力形式
キャラクターの紹介（2〜3行）のあと、完成したHTMLを \`\`\`html コードブロック1つで出力してください。省略は禁止です。`;
}

/** 返答・HTMLから <script id="character"> の中身を取り出す */
export function extractCharacterScript(text: string): string {
  const match = /<script[^>]*id=["']character["'][^>]*>([\s\S]*?)<\/script>/i.exec(text);
  if (match?.[1]?.trim()) return match[1].trim();
  // id が無い場合、window.CHARACTER を定義している script を探す
  for (const m of text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1] && /window\.CHARACTER\s*=/.test(m[1])) return m[1].trim();
  }
  throw new Error('キャラクターのコード（<script id="character">）が見つかりませんでした');
}

export interface CharacterDraw {
  name?: string;
  draw(ctx: CanvasRenderingContext2D, opts: Record<string, unknown>): void;
}

/** モーショングラフィックス側に教える、キャラの使い方 */
export function characterPromptSection(character: CharacterSettings): string {
  return `# 看板キャラクター「${character.name}」（必ず登場させる）
キャラクターの描画関数 \`window.CHARACTER.draw(ctx, opts)\` は、このツールが**HTMLの読み込み前に自動で用意します**。自分でキャラを描いたり、関数を書き直したりしないでください。
- イメージ: ${character.concept}
- 呼び出し方: \`window.CHARACTER.draw(ctx, { x, y, size, t, expression, pose, mouth, look, flip })\`
  - x, y は足元の中心、size は身長(px)
  - expression: ${EXPRESSIONS.join(" / ")}
  - pose: ${POSES.join(" / ")}
  - mouth（0〜1）には必ず \`window.MG_VOICE_LEVEL(t)\` を渡す（ナレーションの実際の音量。口が声に合わせて動く）
- 単体で開いたときにも落ちないよう、使う前に \`if (window.CHARACTER)\` で存在を確認する。\`window.MG_VOICE_LEVEL\` が無いときは 0 を使う
- 演出のルール:
  - キャラは「解説している本人」。ほぼ全編に登場させ、セリフの内容に合わせて表情とポーズを切り替える（驚きの事実で surprised、問いかけで thinking、結論で happy や smug、呼びかけで point や wave）
  - 表情を切り替える瞬間は、軽く跳ねる（squash & stretch）・大きさをポップさせるなどで変化を見せる
  - 主役の文字や図解の邪魔をしない位置（画面下寄りの左右どちらか、身長は画面高さの25〜35%程度）に置き、文字とは重ねない。決め所ではキャラを大きく見せてもよい
  - 登場・退場・場所移動は easeOutBack などで気持ちよく。立っているだけの時間も、呼吸の揺れや視線（look）の変化で止めない`;
}

/**
 * 読み込み時に差し込むスクリプト。
 * MG_VOICE_LEVEL(t) で、ナレーションの音量（0〜1）を時刻から引ける。
 */
export function hostExtrasScript(characterScript: string | undefined, voiceLevels: number[] | undefined, fps = 30): string {
  const levels = voiceLevels ? JSON.stringify(voiceLevels.map((v) => Math.round(v * 100) / 100)) : "[]";
  const voice = `window.MG_VOICE_LEVEL=(function(L,F){return function(t){if(!L.length)return 0;var i=Math.max(0,Math.min(L.length-1,Math.floor(t*F)));return L[i]||0;};})(${levels},${fps});`;
  const character = characterScript ? characterScript.replace(/<\/script/gi, "<\\/script") : "";
  return `<script>${voice}</script>${character ? `<script>${character}</script>` : ""}`;
}

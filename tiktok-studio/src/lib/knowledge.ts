/**
 * スタジオ全体で使う「ノウハウ」データ。
 * プロンプト生成・UI・育成ガイドはすべてここを参照する。
 */

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  /**
   * TikTokのUI（右側アイコン列・下部キャプション・上部タブ）に隠れない安全領域。
   * 主要テキストはこの矩形の中に置く。
   */
  safe: { left: 64, top: 220, right: 900, bottom: 1480 },
  /** Gemini TTSの日本語をテンポよく読ませたときのおおよその文字/秒 */
  charsPerSecond: 7.2,
  /** シーン間の無音（秒） */
  sceneGap: 0.12,
  /** 冒頭の無音（秒）— 0.1秒以内に声が出るのが理想 */
  leadIn: 0.05,
  /** 最後の余韻（秒）— ループ用に短く */
  tail: 0.45
} as const;

export interface HookPreset {
  id: string;
  name: string;
  formula: string;
  example: string;
  visual: string;
}

export const HOOKS: HookPreset[] = [
  {
    id: "shock-number",
    name: "衝撃の数字",
    formula: "意外な数字を最初の一言でぶつける",
    example: "日本人の9割が、これを間違えてます。",
    visual: "巨大な数字が画面を割って登場→カウントアップ→ズームパンチ"
  },
  {
    id: "you-lose",
    name: "知らないと損",
    formula: "視聴者の損失回避を刺激する",
    example: "これ知らないだけで、毎年3万円損してます。",
    visual: "財布・お金アイコンが崩れる／赤い警告ストライプが走る"
  },
  {
    id: "myth-bust",
    name: "常識を否定",
    formula: "みんなが信じている常識を否定して始める",
    example: "「牛乳で骨が強くなる」、実は逆かもしれません。",
    visual: "常識の文字に赤いバツ印がスタンプされ、文字が砕ける"
  },
  {
    id: "question",
    name: "答えたくなる問い",
    formula: "つい頭の中で答えてしまう質問",
    example: "信号の「青」、どう見ても緑ですよね？",
    visual: "大きなクエスチョンマークが回転して着地、選択肢が並ぶ"
  },
  {
    id: "ranking",
    name: "ランキング逆順",
    formula: "第◯位から始め、1位を最後まで引っ張る",
    example: "日本一◯◯な県ランキング、第5位から。",
    visual: "順位のブロックが積み上がり、1位だけシルエットで隠す"
  },
  {
    id: "stop",
    name: "ストップ呼びかけ",
    formula: "行動を止めさせる命令形",
    example: "スマホの充電、100%まで待つのやめてください。",
    visual: "画面全体に『STOP』が叩きつけられ、カメラシェイク"
  },
  {
    id: "story",
    name: "物語の途中から",
    formula: "クライマックス直前から始める",
    example: "その男は、たった1枚の紙で国を買いました。",
    visual: "シネマスコープの黒帯が閉じ、シルエットがスポットに浮かぶ"
  },
  {
    id: "comparison",
    name: "比較で見せる",
    formula: "AとBを並べて、どっちか考えさせる",
    example: "1億円を一括でもらうか、毎日1円が倍になるか。",
    visual: "画面が左右に分割、VSが中央で弾ける"
  }
];

export interface StylePreset {
  id: string;
  name: string;
  summary: string;
  /** プロンプトにそのまま入れる演出指示 */
  direction: string[];
}

export const STYLES: StylePreset[] = [
  {
    id: "kinetic-type",
    name: "キネティック・タイポ",
    summary: "文字そのものが主役。言葉が跳ね、割れ、積み上がる王道スタイル",
    direction: [
      "文字が主役。1画面1メッセージ、最大2行、キーワードは画面幅の70〜90%まで拡大してよい",
      "文字は1文字ずつ30〜45msずらして登場（スタッガー）。登場はscale 0.6→1.08→1.0のオーバーシュート",
      "強調語は色反転ボックス・ハイライトマーカー・マスク内スライドのいずれかで叩く",
      "シーン転換は『前の文字が拡大してカメラを突き抜ける→次の画面』のズームスルーを基本にする",
      "背景は単色＋ゆっくり動く大きな幾何学形状（円・帯）でリズムを作る"
    ]
  },
  {
    id: "infographic",
    name: "図解インフォグラフィック",
    summary: "数字・グラフ・アイコンで理解させる解説系。雑学・お金・ビジネス向け",
    direction: [
      "数字は必ずカウントアップ（easeOutExpo, 0.6〜0.9秒）。単位は小さく、数字は巨大に",
      "棒グラフ・円グラフ・比較バーは描画アニメーション（線が伸びる/円弧が回る）で見せる",
      "アイコンは線画（stroke）をパスの描き順アニメーションで描く。塗りは後から0.15秒でフェード",
      "情報のまとまりはカード（角丸24px、薄い影）に入れ、カードごとにスタッガーで積む",
      "グリッド線や方眼の背景をうっすら動かし『データっぽさ』を出す"
    ]
  },
  {
    id: "neo-brutal",
    name: "ネオブルータリズム",
    summary: "極太の黒フチ・原色・ハードシャドウ。強いインパクトとポップさ",
    direction: [
      "全要素に太い黒アウトライン（8〜12px）とずらしたハードシャドウ（オフセット14px、ぼかしなし）",
      "動きはバウンス強め：spring（減衰0.5前後）でボヨンと止まる。スタンプのように叩きつける",
      "ステッカー・吹き出し・矢印・星などの装飾が要所で飛び込む",
      "カラーは原色ベタ塗り。グラデーション禁止",
      "転換は画面を横切る極太の帯（ワイプ）や、紙をめくるようなスライド"
    ]
  },
  {
    id: "cinematic",
    name: "シネマティック",
    summary: "暗めのトーン・光・粒子。歴史・ミステリー・ストーリー系",
    direction: [
      "暗い背景に光源（放射グラデーション）とゆっくり漂う粒子・塵で奥行きを作る",
      "カメラは常にゆっくりプッシュイン（1シーンでscale 1.0→1.06）。静止画面を作らない",
      "文字は明朝系・字間広め。ブラー（8px→0）＋フェードで浮かび上がる",
      "転換はフラッシュ白（2〜3フレーム）、レンズフレア、黒へのマッチカット",
      "レターボックスの黒帯、フィルムグレイン、周辺減光で映画の質感"
    ]
  },
  {
    id: "glass-gradient",
    name: "グラスモーフィズム",
    summary: "流れるグラデーション＋すりガラス。美容・ライフハック・テック向け",
    direction: [
      "背景は3〜4色のメッシュグラデーションがゆっくり有機的に流動する",
      "情報はすりガラスカード（半透明白、背景ぼかし風の二重描画、1pxのハイライト枠）に乗せる",
      "動きはなめらか・上品に（easeInOutCubic中心、オーバーシュート控えめ）",
      "光の反射（スペキュラーのスウィープ）がカードの上を斜めに走る",
      "転換はカードが奥へ下がり、新しいカードが手前から来る奥行きトランジション"
    ]
  },
  {
    id: "retro-pop",
    name: "レトロポップ／Y2K",
    summary: "ドット・ハーフトーン・グリッチ。エンタメ・ネタ系",
    direction: [
      "ハーフトーンドット、ストライプ、チェッカー柄をパターンとして動かす",
      "文字は極太ゴシック＋多重のずらしアウトライン（3色）",
      "要所でRGBずれのグリッチ（2〜4フレーム）とスキャンライン",
      "要素はパタパタと回転しながら入る（フリップ）",
      "転換はピクセルディゾルブ、星形のアイリスワイプ"
    ]
  }
];

export interface Palette {
  id: string;
  name: string;
  colors: { bg: string; surface: string; text: string; accent: string; accent2: string };
}

export const PALETTES: Palette[] = [
  { id: "night-lime", name: "ナイト×ライム", colors: { bg: "#0b0b12", surface: "#1a1a26", text: "#f5f5f7", accent: "#c6ff3d", accent2: "#7a5cff" } },
  { id: "cream-red", name: "クリーム×赤", colors: { bg: "#f6efe3", surface: "#ffffff", text: "#161616", accent: "#e8322b", accent2: "#1f4bd8" } },
  { id: "yellow-black", name: "警告イエロー", colors: { bg: "#ffd400", surface: "#ffffff", text: "#111111", accent: "#111111", accent2: "#ff3b6b" } },
  { id: "deep-gold", name: "深藍×金", colors: { bg: "#0a1024", surface: "#141d3a", text: "#f1ead7", accent: "#d9b25f", accent2: "#5ec8ff" } },
  { id: "pastel-pop", name: "パステルポップ", colors: { bg: "#ffe3f1", surface: "#ffffff", text: "#2b1a3a", accent: "#ff4fa3", accent2: "#27c6ff" } },
  { id: "mint-navy", name: "ミント×ネイビー", colors: { bg: "#e9fbf5", surface: "#ffffff", text: "#0d2340", accent: "#00b894", accent2: "#ff7a3d" } }
];

export interface FontPreset {
  id: string;
  name: string;
  family: string;
  weights: number[];
  note: string;
}

/** Google Fontsで読み込める日本語フォント */
export const FONTS: FontPreset[] = [
  { id: "noto-black", name: "Noto Sans JP（極太）", family: "Noto Sans JP", weights: [500, 900], note: "万能。迷ったらこれ" },
  { id: "dela", name: "Dela Gothic One", family: "Dela Gothic One", weights: [400], note: "超極太。インパクト最強" },
  { id: "mplus-rounded", name: "M PLUS Rounded 1c", family: "M PLUS Rounded 1c", weights: [500, 800], note: "丸ゴシック。親しみやすい" },
  { id: "mochiy", name: "Mochiy Pop One", family: "Mochiy Pop One", weights: [400], note: "ポップで可愛い" },
  { id: "zen-old-mincho", name: "Zen Old Mincho", family: "Zen Old Mincho", weights: [700, 900], note: "明朝。シネマ・歴史向け" },
  { id: "rocknroll", name: "RocknRoll One", family: "RocknRoll One", weights: [400], note: "勢いのある個性派" }
];

export interface VoicePreset {
  name: string;
  trait: string;
}

/** Gemini TTSのプリセットボイス（日本語も話せる） */
export const VOICES: VoicePreset[] = [
  { name: "Kore", trait: "しっかり・芯がある" },
  { name: "Puck", trait: "明るくアップビート" },
  { name: "Zephyr", trait: "明るい" },
  { name: "Charon", trait: "落ち着いた解説調" },
  { name: "Fenrir", trait: "興奮気味・勢い" },
  { name: "Leda", trait: "若々しい" },
  { name: "Aoede", trait: "軽やか" },
  { name: "Callirrhoe", trait: "のんびり" },
  { name: "Autonoe", trait: "明るい" },
  { name: "Enceladus", trait: "息づかい多め" },
  { name: "Iapetus", trait: "クリア" },
  { name: "Umbriel", trait: "気さく" },
  { name: "Algieba", trait: "なめらか" },
  { name: "Despina", trait: "なめらか" },
  { name: "Erinome", trait: "クリア" },
  { name: "Algenib", trait: "ハスキー" },
  { name: "Rasalgethi", trait: "解説調" },
  { name: "Laomedeia", trait: "アップビート" },
  { name: "Achernar", trait: "ソフト" },
  { name: "Alnilam", trait: "しっかり" },
  { name: "Schedar", trait: "安定・フラット" },
  { name: "Gacrux", trait: "大人っぽい" },
  { name: "Pulcherrima", trait: "前のめり" },
  { name: "Achird", trait: "フレンドリー" },
  { name: "Zubenelgenubi", trait: "カジュアル" },
  { name: "Vindemiatrix", trait: "やさしい" },
  { name: "Sadachbia", trait: "生き生き" },
  { name: "Sadaltager", trait: "知的" },
  { name: "Sulafat", trait: "あたたかい" },
  { name: "Orus", trait: "しっかり" }
];

export const VOICE_DIRECTIONS: { label: string; text: string }[] = [
  { label: "テンポよく解説", text: "日本のショート動画の人気ナレーターのように、明るくテンポよく、語尾を伸ばさずに歯切れよく読んでください。" },
  { label: "ささやき・ミステリー", text: "秘密を打ち明けるように、低めの声で少しゆっくり、間を大切にして読んでください。" },
  { label: "ハイテンション", text: "驚きと興奮を込めて、エネルギッシュに速めのテンポで読んでください。" },
  { label: "落ち着いたニュース", text: "ニュースキャスターのように落ち着いて、はっきりと明瞭に読んでください。" },
  { label: "友達に話す", text: "仲の良い友達に話しかけるように、自然でくだけた口調で読んでください。" }
];

export const CLAUDE_MODELS: { id: string; label: string }[] = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5（標準・おすすめ）" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1（最高品質・高コスト）" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5（速い・安い）" }
];

export const TTS_MODELS: { id: string; label: string }[] = [
  { id: "gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS（高品質）" },
  { id: "gemini-3.8-flash-lite-tts", label: "Gemini 3.8 Flash-Lite TTS（速い・安い）" }
];

export const NICHE_IDEAS: { niche: string; why: string }[] = [
  { niche: "お金の雑学・節約術", why: "保存されやすく、損失回避フックが効く" },
  { niche: "1分でわかる歴史の裏話", why: "物語フック×シネマ演出が映える" },
  { niche: "心理学・行動経済学", why: "『あなたも当てはまる』でコメントが伸びる" },
  { niche: "日本語・言葉の語源", why: "クイズ型で最後まで見られやすい" },
  { niche: "宇宙・科学のスケール比較", why: "数字×図解モーションと相性抜群" },
  { niche: "世界の意外なランキング", why: "逆順ランキングで完走率が上がる" },
  { niche: "スマホ・PCの便利ワザ", why: "保存・シェアされやすい実用系" }
];

export const GOALS: Record<string, { label: string; cta: string }> = {
  follow: { label: "フォロー", cta: "続きやシリーズを見たくなる一言でフォローを促す" },
  save: { label: "保存", cta: "『あとで見返せるように保存』を自然に促す" },
  share: { label: "シェア", cta: "『これ知らない人に送ってあげて』とシェアを促す" },
  comment: { label: "コメント", cta: "二択や自分の経験を聞いてコメントを促す" }
};

export function findOrFirst<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((item) => item.id === id) ?? list[0];
  if (!found) throw new Error("プリセットが空です");
  return found;
}

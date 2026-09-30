/**
 * 演出テクニック辞典。
 * 元資料：docs/reference/motion_graphics_techniques.json（ユーザー提供）の手法を、
 * このツールの契約（Canvas 2D・render(t) は t だけで決まる純粋関数・1080×1920固定）に合わせて書き直したもの。
 * 毎フレーム状態を更新する物理（v *= friction 等）は「t の式」に、残像（全消去しない）は「過去の時刻を重ね描き」に置き換えている。
 */

export interface Technique {
  /** 元資料の TECH-xxx に対応 */
  id: string;
  name: string;
  category: string;
  /** どんな場面で効くか（UI表示用） */
  when: string;
  /** Claudeへの実装指示（決定的に作るための具体策） */
  recipe: string;
}

export const TECHNIQUES: Technique[] = [
  // 基本運動
  { id: "TECH-001", category: "基本運動", name: "潰れと伸び", when: "着地・叩きつけ・弾む文字", recipe: "着地の瞬間に scaleY を最大0.7、scaleX を 1/scaleY にして体積を保ち、easeOutBack で1.0へ戻す。着地時刻は字幕の強調タイミングに合わせる" },
  { id: "TECH-002", category: "基本運動", name: "スタッガー波及", when: "リスト・グリッド・文字の連続出現", recipe: "要素 i の開始時刻 = 基準 + i×0.03〜0.1秒。『中心から』『両端から』の順番も使う（順番は index から計算）" },
  { id: "TECH-005", category: "基本運動", name: "多層パララックス", when: "奥行きのある背景", recipe: "背景0.2・中景0.5・前景1.2の比率で、同じカメラ移動量に係数を掛けて各層を動かす" },

  // 線とかたち
  { id: "TECH-006", category: "線とかたち", name: "線をなぞって描く", when: "アイコン・矢印・グラフ線の登場", recipe: "パス長 L に対し setLineDash([L, L]) と lineDashOffset = L×(1−p) で描く（p は easeOutExpo の進捗）。塗りは線が描き終わってから0.15秒でフェード" },
  { id: "TECH-007", category: "線とかたち", name: "形のモーフィング", when: "記号の変身（〇→★、？→！）", recipe: "頂点数をそろえた2つの多角形の各頂点を easeInOutCubic で補間して描く" },
  { id: "TECH-008", category: "線とかたち", name: "ぷるぷる融合（メタボール）", when: "2つのものがくっつく・分かれる", recipe: "小さめのオフスクリーン canvas に円を描き、ctx.filter='blur(10px)' で描いたあと別キャンバスへ ctx.filter='contrast(20)' で転写して境界をくっきりさせ、拡大して合成（重いので低解像度で）" },
  { id: "TECH-009", category: "線とかたち", name: "波打つ線・リボン", when: "音声波形・揺れる帯", recipe: "x ごとに y = A·sin(x·freq + t·speed) を足した折れ線を描く" },
  { id: "TECH-010", category: "線とかたち", name: "放射状バースト", when: "強調語が叩かれる瞬間の集中線", recipe: "中心から N 本の線・三角を角度 i×2π/N で放射し、長さを easeOutExpo で伸ばしながら 0.3 秒でフェードアウト" },

  // 文字
  { id: "TECH-011", category: "文字", name: "マスク内スライドイン", when: "タイトル・キャッチコピー", recipe: "行ごとに ctx.clip() で矩形マスクを作り、各文字を y=+100% から 0 へ easeOutQuart で、0.03秒ずつずらして出す" },
  { id: "TECH-012", category: "文字", name: "波打つ文字", when: "ポップ・感情が高ぶるセリフ", recipe: "文字 i の y に A·sin(t·ω + i·0.5)、回転に小さな sin を加える" },
  { id: "TECH-013", category: "文字", name: "タイプライター＋グリッチ", when: "AI・秘密・ミステリー", recipe: "表示文字数 = floor(p×n)。末尾1〜2文字は、フレーム番号から決まる疑似ランダム（シード付きの表）で記号に置き換え、点滅カーソルは floor(t×2)%2 で" },
  { id: "TECH-014", category: "文字", name: "3Dめくり切り替え", when: "単語の切り替え・ランキング", recipe: "rotateX の代わりに scaleY = cos(角度) で縦に潰し、90°を超えたら次の単語に差し替える（明度も cos で少し落とす）" },
  { id: "TECH-015", category: "文字", name: "曲線に沿う文字", when: "円形の帯・流れるテキスト", recipe: "ベジェ曲線上の位置と接線角度を計算し、各文字を translate+rotate して並べ、開始位置を t で送る" },

  // 粒子
  { id: "TECH-017", category: "粒子", name: "紙吹雪・粒子バースト", when: "正解・1位発表・祝福", recipe: "粒子ごとの初速・色・回転をシード付き乱数で初期化時に決め、経過 s 秒の位置を式で出す：x = x0 + vx·τ(1−e^(−s/τ))、y = y0 + vy·τ(1−e^(−s/τ)) + ½g·s²、透明度 = 1−s/寿命" },
  { id: "TECH-018", category: "粒子", name: "流れる粒子（フローフィールド）", when: "空気感・オーロラ・煙", recipe: "初期化時に全フレーム分の粒子座標をノイズ場で積分して配列に保存し、render(t) では floor(t×fps) 番目を引くだけにする" },
  { id: "TECH-021", category: "粒子", name: "星座ネットワーク", when: "テクノロジー・つながり・人間関係", recipe: "ノード位置を基準点 + sin/cos のゆらぎで t から計算し、距離 d < 最大距離 のペアを透明度 1−d/最大距離 の線で結ぶ" },

  // 疑似3D
  { id: "TECH-022", category: "疑似3D", name: "めまいズーム", when: "衝撃の事実・心理的インパクト", recipe: "主役の大きさは固定のまま、背景だけを 1.0→1.6 に拡大（または逆）して空間が歪む感覚を出す" },
  { id: "TECH-023", category: "疑似3D", name: "ワイヤーフレームの地形", when: "レトロ・サイバー背景", recipe: "格子点の高さ z = sin/ノイズ(x, y, t)、画面座標 = 中心 + (x, y−z)×焦点距離/(奥行き) で透視投影して線で結ぶ" },
  { id: "TECH-024", category: "疑似3D", name: "カードがめくれる格子", when: "情報の一斉切り替え", recipe: "格子の各カードを scaleX = cos(角度) で裏返し、角度の開始を (行+列)×0.05秒 ずつずらす" },
  { id: "TECH-025", category: "疑似3D", name: "周回する衛星リング", when: "主役を引き立てる周辺の動き", recipe: "x = r·cos(θ)、奥行き = r·sin(θ)、y = 奥行き×傾き。奥行きで大きさと明るさを変え、奥のものを主役より先に描く" },

  // 光と質感
  { id: "TECH-027", category: "光と質感", name: "RGBずれ（色収差）", when: "グリッチ・衝撃の瞬間（2〜4フレーム）", recipe: "同じ文字を純赤・純緑・純青で、横に数pxずらして globalCompositeOperation='lighter' で重ねる（暗い背景向け）" },
  { id: "TECH-028", category: "光と質感", name: "発光（ブルーム）", when: "ネオン・強調語・エネルギー", recipe: "光らせたい要素だけを小さなオフスクリーンに描き、ctx.filter='blur(16px)' で拡大しながら 'lighter' で重ねる。オフスクリーンは使い回す" },
  { id: "TECH-030", category: "光と質感", name: "走査線とフィルムノイズ", when: "レトロ・監視カメラ風", recipe: "走査線とノイズのテクスチャを初期化時に数枚作り、フレーム番号で切り替えて overlay 合成" },
  { id: "TECH-036", category: "光と質感", name: "残像（モーショントレイル）", when: "高速移動・流れ星", recipe: "画面を消さずに残すのではなく、同じ物体を t, t−1/60, t−2/60… の位置に透明度を下げながら4〜6回重ねて描く（決定的）" },
  { id: "TECH-037", category: "光と質感", name: "後光（ゴッドレイ）", when: "神々しい登場・1位発表", recipe: "主役の後ろに、中心から伸びる細い扇形グラデーションを十数本描き、全体をゆっくり回転させる" },
  { id: "TECH-038", category: "光と質感", name: "水面のゆらめき光", when: "癒やし・神秘・水中", recipe: "複数の sin 波の重ね合わせで網目状の明るさを低解像度オフスクリーンに描き、拡大して screen 合成" },

  // 場面転換
  { id: "TECH-032", category: "場面転換", name: "円形アイリスワイプ", when: "焦点の切り替え", recipe: "次シーンを arc の clip の中にだけ描き、半径を 0→画面対角線 に easeInOutCubic で広げる" },
  { id: "TECH-033", category: "場面転換", name: "斜めスラッシュワイプ", when: "テンポよく次の話題へ", recipe: "画面を斜めの帯に分け、各帯を時間差（帯 i×0.03秒）で横に抜いて次シーンを見せる" },
  { id: "TECH-034", category: "場面転換", name: "モザイク転換", when: "ゲーム風・デジタル", recipe: "画面を小さいオフスクリーンに縮小して imageSmoothingEnabled=false で拡大表示。粒度を細→粗→細と変え、一番粗い瞬間に次シーンへ差し替える" },
  { id: "TECH-035", category: "場面転換", name: "インクがにじむ転換", when: "やわらかい場面転換", recipe: "シード付き乱数で決めた数十個の円を、それぞれ時間差で半径を広げてマスクにし、その中に次シーンを描く" }
];

/** スタイルごとの「おまかせ」テクニック */
export const STYLE_TECHNIQUES: Record<string, string[]> = {
  "kinetic-type": ["TECH-011", "TECH-002", "TECH-001", "TECH-010", "TECH-033"],
  infographic: ["TECH-006", "TECH-002", "TECH-024", "TECH-021", "TECH-032"],
  "neo-brutal": ["TECH-001", "TECH-010", "TECH-033", "TECH-014", "TECH-017"],
  cinematic: ["TECH-005", "TECH-022", "TECH-037", "TECH-030", "TECH-036"],
  "glass-gradient": ["TECH-005", "TECH-008", "TECH-028", "TECH-038", "TECH-032"],
  "retro-pop": ["TECH-013", "TECH-027", "TECH-034", "TECH-030", "TECH-012"]
};

export const MAX_TECHNIQUES = 5;

/** 選ばれたテクニック（空ならスタイルのおまかせ） */
export function resolveTechniques(styleId: string, selected: string[] | undefined): { techniques: Technique[]; auto: boolean } {
  const auto = !selected || selected.length === 0;
  const ids = auto ? (STYLE_TECHNIQUES[styleId] ?? []) : selected;
  return { techniques: ids.map((id) => TECHNIQUES.find((t) => t.id === id)).filter((t): t is Technique => Boolean(t)), auto };
}

/** イージング辞典（Claudeにそのまま渡す式） */
export const EASING_LIBRARY = [
  "easeOutExpo(p) = p>=1 ? 1 : 1 − 2^(−10p)　… 画面外からの急な登場・UIの出現",
  "easeOutBack(p) = 1 + 2.70158(p−1)³ + 1.70158(p−1)²　… ポップな着地（オーバーシュート）",
  "easeInBack(p) = 2.70158p³ − 1.70158p²　… 大きく動く前の『溜め』（予備動作）",
  "spring(p) = 1 − e^(−ζωp)·cos(ω√(1−ζ²)·p)（ζ≈0.35, ω≈18）　… 自然な揺れ戻し。フレームごとに速度を更新する方式は使わない",
  "easeInOutCubic(p)　… 画面全体の転換・カメラ移動"
];

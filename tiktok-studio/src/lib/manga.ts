/**
 * 「漫画ドラマ × キャラの解説」の動画の型。
 * あるあるの恋愛ドラマを2〜4コマの漫画で見せて共感させ、看板キャラが心理学で解説する。
 * コマの絵は Codex（画像生成）に描かせ、登場人物は設定画を参考画像として渡して毎回同じ見た目にそろえる。
 */
import { PALETTES, findOrFirst } from "./knowledge";
import type { CastMember, Concept, Scene, Script, VoiceSettings } from "./types";

export const DEFAULT_CAST: CastMember[] = [
  { id: "kare", name: "ユウト（彼）", description: "20代後半の会社員の男性。黒髪の短髪、優しそうなたれ目、紺のシャツ。ちょっと不器用で照れ屋" },
  { id: "kanojo", name: "ミカ（彼女）", description: "20代半ばの女性。肩までの明るい茶髪、ベージュのニット、表情豊か。恋愛に悩みがち" }
];

export function castOf(cast: CastMember[] | undefined): CastMember[] {
  return cast && cast.length > 0 ? cast : DEFAULT_CAST;
}

/** このシーンを読む声（登場人物のセリフなら、その人の声に差し替える） */
export function sceneVoice(voice: VoiceSettings, scene: Pick<Scene, "speaker">, cast: CastMember[] | undefined): VoiceSettings {
  if (!scene.speaker) return voice;
  const member = castOf(cast).find((m) => m.id === scene.speaker);
  const engine = voice.engine ?? "gemini";
  if (!member?.voice) return voice;
  if (engine === "gemini") return member.voice.gemini ? { ...voice, voiceName: member.voice.gemini } : voice;
  const local = member.voice[engine];
  return local ? { ...voice, localSpeaker: local.speaker, localSpeakerName: local.name } : voice;
}

/** 設定画の素材名（動画には使わず、コマを描くときの参考にする） */
export function castRefName(member: CastMember): string {
  return `ref_cast_${member.id}`;
}

/** コマ絵の素材名（シーン番号は 1 から、コマ番号も 1 から） */
export function panelName(sceneNumber: number, panelNumber: number): string {
  return `panel_${String(sceneNumber).padStart(2, "0")}_${panelNumber}`;
}

/** 台本プロンプトに入れる、漫画ドラマの型の説明 */
export function mangaScriptSection(cast: CastMember[], teacher: string): string {
  return `# 動画の型：漫画ドラマ × ${teacher}の解説（フェルミ漫画大学のような「ドラマで共感 → 解説で納得」の構成。ただし絵柄・キャラ・言い回しは真似しない）
## 登場人物（ドラマに出るのはこの人たちだけ。panels の cast / speaker にはIDを書く）
${cast.map((m) => `- ID「${m.id}」${m.name}：${m.description}`).join("\n")}

## 構成（この順番で）
1. hook（1シーン）：あるあるの悩みを一撃で突きつける問い（例「LINEの返信が早い男、実は…」）
2. drama（3〜5シーン）：登場人物のすれ違い・ドキッとする瞬間を漫画で見せる。**1シーン＝1コマ**（多くても2コマ）。シーンは次の2種類を混ぜる
   - 登場人物のセリフ：speaker にその人のID、narration にそのセリフ（20文字以内の話し言葉）。**その人の声で読み上げる**
   - 状況のナレーション：speaker は空、narration に短い状況説明（例「付き合って3ヶ月。最近ミカは不安だった」）
   - 登場人物のセリフを2つ以上入れて、会話として聞こえるようにする
3. body（2〜3シーン）：${teacher}が「これは心理学で〇〇っていうの」と、心理学の用語・研究で理由を解説する。用語を1つ必ず覚えて帰れるように（speaker は空）
4. twist（1シーン）：「でも実は〜」の意外な一言、または今日から使えるワンポイント
5. cta → loop

## コマ（panels）の書き方
- drama のシーンだけに panels を書く（ほかのシーンは空の配列 []）
- shot：画像生成で描ける具体的な指示。場所・時間帯・カメラの距離（顔のアップ／上半身／引き）・表情・しぐさ（例「夜の部屋、ベッドに座ってスマホを見て頬を赤らめるミカ。上半身」）
- line：吹き出しに出す文字。登場人物のセリフのシーンなら、そのセリフ（長ければ12文字以内に縮める）。speaker にそのセリフを話す人のID
- sfx：描き文字の効果音（ドキッ・ガーン・ソワソワ など。無ければ空）
- 1コマに出す人物は1〜2人まで。同じシーンの2コマは「原因 → 反応」のように流れをつくる`;
}

/** Codex への依頼：登場人物の設定画（コマを描くときの参考画像にする） */
export function buildCastSheetPrompt(cast: CastMember[], concept: Concept): string {
  const palette = findOrFirst(PALETTES, concept.paletteId);
  return `# 依頼：漫画の登場人物の設定画
縦型ショート動画の漫画ドラマに毎回出てくる登場人物の「設定画」を作ってください。以後のコマはこの設定画を参考に描くので、**はっきりした特徴**（髪型・髪色・服・目）で描き分けてください。

## 画風（全員で統一）
- 日本のカラー漫画・アニメ調。きれいな線、やわらかい影、明るい色。配色のアクセントは ${palette.colors.accent} と ${palette.colors.accent2}
- 実在の人物・既存の漫画やアニメのキャラクターに似せない（オリジナル）

## 作る画像（1人1枚、縦 1024×1536、背景は白の無地）
${cast.map((m) => `- ref_cast_${m.id}.png：${m.name}。${m.description}。左に全身（正面）、右上に顔のアップ（ふつう・笑顔・驚き の3表情）を並べた設定画。文字は入れない`).join("\n")}`;
}

/** Codex への依頼：ドラマのコマ絵（設定画を参考画像として一緒に渡す） */
export function buildPanelPrompt(script: Script, cast: CastMember[], concept: Concept): { prompt: string; count: number } {
  const palette = findOrFirst(PALETTES, concept.paletteId);
  const byId = new Map(cast.map((m) => [m.id, m]));
  const rows: string[] = [];
  script.scenes.forEach((scene, i) => {
    (scene.panels ?? []).forEach((panel, j) => {
      const who = panel.cast.map((id) => byId.get(id)?.name ?? id).join("・") || "人物なし";
      rows.push(`| ${panelName(i + 1, j + 1)}.png | ${who} | ${panel.shot.replace(/\|/g, "／")} |`);
    });
  });
  const prompt = `# 依頼：漫画ドラマのコマ絵
縦型ショート動画で使う、漫画のコマの絵を作ってください。吹き出し・セリフ・効果音の文字は動画の側で重ねるので、**絵には文字を一切入れないでください**。

## 登場人物（添付の設定画と同じ見た目で描く。髪型・髪色・服・顔立ちを変えない）
${cast.map((m) => `- ${m.name}（添付の ref_cast_${m.id}）：${m.description}`).join("\n")}

## 画風（全コマで統一）
- 日本のカラー漫画のコマ。きれいな線、やわらかい影、感情が伝わる表情。背景は場所がわかる程度に描き込む
- 配色のアクセントは ${palette.colors.accent} と ${palette.colors.accent2}
- 正方形 1024×1024。人物の顔がコマの中央〜上寄りにくるように（上下が少し切れても困らない構図）
- 文字・吹き出し・効果音の文字・ロゴ・枠線は描かない

## 作るコマ（ファイル名どおりに1枚ずつ）
| ファイル名 | 出る人 | 描く内容 |
|---|---|---|
${rows.join("\n")}`;
  return { prompt, count: rows.length };
}

/** 動画プロンプトに入れる、漫画ドラマの見せ方 */
export function mangaMotionSection(script: Script, cast: CastMember[], panelNames: string[]): string {
  const byId = new Map(cast.map((m) => [m.id, m]));
  const rows: string[] = [];
  script.scenes.forEach((scene, i) => {
    (scene.panels ?? []).forEach((panel, j) => {
      const name = panelName(i + 1, j + 1);
      const has = panelNames.includes(name);
      const speaker = panel.speaker ? byId.get(panel.speaker)?.name ?? panel.speaker : "";
      const voice = scene.speaker ? byId.get(scene.speaker)?.name ?? scene.speaker : "ナレーション";
      rows.push(`| ${i + 1} | ${voice} | ${has ? `"${name}"` : "（絵なし：K.manga.panel の draw で描く）"} | ${panel.line ? `${speaker}「${panel.line}」` : "—"} | ${panel.sfx || "—"} |`);
    });
  });
  if (rows.length === 0) return "";
  return `# 漫画ドラマのシーン（drama）の見せ方（必須）
drama のシーンは、**漫画のページのようにコマが次々に現れる**画面にする。コマの絵は素材として用意済み（無いものは図形で描く）。
| シーン | 声 | コマの絵 | 吹き出し（話す人「セリフ」） | 描き文字 |
|---|---|---|---|---|
${rows.join("\n")}

- レイアウト：\`const rects = K.manga.layout("2v")\`（コマ数に合わせて "1" / "2v" / "2d" / "3" / "4"）でコマの位置を決める
- コマ：\`K.manga.panel(ctx, t, rects[0], {image: "panel_02_1", start, from: "left", zoomFrom: 1.0, zoomTo: 1.12})\` で、セリフに合わせて1コマずつ登場させる（中の絵はゆっくり寄る）
- 吹き出し：\`K.manga.bubble(ctx, t, "セリフ", x, y, {start, kind: "speech" | "shout" | "thought", tailX, tailY})\`。しっぽは話す人の口元へ。登場人物が話すシーンは**そのシーンの声が始まる時刻**に出す（それ以外はコマが出た0.2秒後）
- 登場人物が話すシーン（表の「声」が人物名）は、その人の声で読み上げ済み。セリフは吹き出しで見せるので、**下の字幕（K.caption）は出さない**。看板キャラはこの間しゃべらない（口を閉じて、うなずく・驚くなどのリアクションだけ）
- 描き文字：\`K.manga.sfx(ctx, t, "ドキッ", x, y, {start, size, color, rot})\` を感情が動く瞬間に
- 盛り上がるコマには \`K.manga.lines(ctx, t, rect)\`（集中線）や \`K.manga.tone(ctx, rect)\`（スクリーントーン）を重ねる
- 漫画のページの背景は紙っぽい白〜淡い色（K.bg.halftone を薄く）。ドラマの間は ${"看板キャラ"}を画面の端に小さく出して「見守る」リアクションをさせてもよい
- drama の次の body（解説）では、画面を切り替えて看板キャラを大きく出し、心理学の用語を K.text3d などで大きく見せる`;
}

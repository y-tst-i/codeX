import { useEffect, useState } from "react";
import { CHARACTER_PRESETS, buildCharacterPrompt, extractCharacterScript, type CharacterSettings } from "../lib/character";
import { checkCharacter } from "../lib/characterHost";
import { askClaude, describeClaudeError } from "../lib/claude";
import { PALETTES, findOrFirst } from "../lib/knowledge";
import { SAMPLE_CHARACTER } from "../lib/sampleCharacter";
import { ImageCharacterPanel } from "./ImageCharacterPanel";
import type { ApiSettings, Concept } from "../lib/types";
import { Field, Notice, PromptBox } from "./common";

interface Props {
  settings: ApiSettings;
  concept: Concept;
  onChange: (character: CharacterSettings | undefined) => void;
}

/** 看板キャラクターを1回デザインして保存する画面 */
export function CharacterStep({ settings, concept, onChange }: Props) {
  const saved = settings.character;
  const [name, setName] = useState(saved?.name ?? "");
  const [idea, setIdea] = useState(saved?.concept ?? "");
  const [pasted, setPasted] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [sheetUrl, setSheetUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [tab, setTab] = useState<"image" | "code">(saved && saved.kind !== "image" ? "code" : "image");
  const palette = findOrFirst(PALETTES, concept.paletteId);
  const prompt = buildCharacterPrompt(name, idea, palette);

  useEffect(() => () => {
    if (sheetUrl) URL.revokeObjectURL(sheetUrl);
  }, [sheetUrl]);

  // 保存済みのキャラがあれば、開いたときに見本を表示する
  useEffect(() => {
    if (saved?.script && saved.kind !== "image") void preview(saved.script);
  }, []);

  const preview = async (script: string) => {
    setChecking(true);
    try {
      const result = await checkCharacter(script);
      setProblems(result.problems);
      if (result.sheet) setSheetUrl(URL.createObjectURL(result.sheet));
      return result;
    } finally {
      setChecking(false);
    }
  };

  const adopt = async (text: string) => {
    setProblems([]);
    let script: string;
    try {
      script = extractCharacterScript(text);
    } catch (e) {
      setProblems([(e as Error).message]);
      return;
    }
    const result = await preview(script);
    if (result.ok) {
      const finalName = name.trim() || result.name || "キャラクター";
      setName(finalName);
      onChange({ name: finalName, concept: idea, script });
      setPasted("");
      setProgress("保存しました。次の動画から登場します。");
    }
  };

  const generate = async () => {
    setRunning(true);
    setProgress("Claudeがキャラクターをデザインしています…");
    try {
      const text = await askClaude({
        settings,
        system: "あなたはキャラクターデザイナー兼クリエイティブコーダーです。シンプルで記憶に残る、オリジナルのキャラクターを Canvas 2D で描きます。",
        prompt,
        onProgress: (n) => setProgress(`受信中… ${n.toLocaleString()}文字`)
      });
      await adopt(text);
    } catch (e) {
      setProblems([describeClaudeError(e)]);
      setProgress("");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <h1>🧸 看板キャラクター</h1>
      <p className="lead">
        アカウントの「顔」になるキャラクターを1回だけデザインして保存します。以降の動画には毎回まったく同じ見た目で登場し、表情とポーズを変えながら、口はナレーションの声に合わせて動きます。
      </p>

      {saved ? (
        <Notice kind="ok" title={`✓ 「${saved.name}」を使用中`}>
          <div className="row" style={{ marginTop: 6 }}>
            <span className="meta">動画ごとに①企画で「キャラを登場させる」をオフにもできます。</span>
            <span className="spacer" />
            <button className="btn small danger" type="button" onClick={() => confirm("看板キャラクターを削除しますか？") && onChange(undefined)}>
              キャラを削除
            </button>
          </div>
        </Notice>
      ) : null}

      {!saved ? (
        <div className="card row">
          <span className="meta" style={{ flex: 1 }}>まずはお試しで、見本のキャラ「{SAMPLE_CHARACTER.name}」（丸メガネのうさぎの先生）を使ってみることもできます。あとから自分のキャラに作り直せます。</span>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const result = await preview(SAMPLE_CHARACTER.script);
              if (result.ok) {
                setName(SAMPLE_CHARACTER.name);
                setIdea(SAMPLE_CHARACTER.concept);
                onChange({ ...SAMPLE_CHARACTER });
              }
            }}
          >
            お試しキャラを使う
          </button>
        </div>
      ) : null}

      {sheetUrl ? (
        <div className="card">
          <img src={sheetUrl} alt="キャラクターの表情とポーズ" style={{ width: "100%", borderRadius: 10 }} />
        </div>
      ) : null}

      <div className="row" style={{ margin: "18px 0 6px" }}>
        <button className={`btn ${tab === "image" ? "primary" : ""}`} type="button" onClick={() => setTab("image")}>
          🖼 画像で作る（おすすめ・口パクがはっきり）
        </button>
        <button className={`btn ${tab === "code" ? "primary" : ""}`} type="button" onClick={() => setTab("code")}>
          ✏️ コードで描く（ポーズで腕も動く）
        </button>
      </div>

      {tab === "image" ? (
        <ImageCharacterPanel
          saved={saved}
          onChange={onChange}
          onPreview={(sheet) => {
            if (sheet) setSheetUrl(URL.createObjectURL(sheet));
          }}
        />
      ) : (
      <>
      <h2>{saved ? "作り直す" : "1. どんなキャラ？"}</h2>
      <div className="card stack">
        <div className="grid-2">
          <Field label="名前（空欄ならClaudeが考えます）">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ラブ先生" />
          </Field>
        </div>
        <Field label="キャラのイメージ" hint="見た目・性格・役割を書くほど、狙いどおりになります。既存のキャラクターに似せるのはNG（著作権のため）">
          <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="例：恋愛心理を教えてくれる、丸メガネのうさぎの先生。ピンクと白。ちょっとおませ。" />
        </Field>
        <div className="chips">
          {CHARACTER_PRESETS.map((preset) => (
            <button key={preset.label} className="chip" type="button" onClick={() => setIdea(preset.text)}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <h2>2. デザインしてもらう</h2>
      <PromptBox
        title="キャラクター設計プロンプト"
        prompt={prompt}
        onRun={generate}
        running={running}
        canRun={Boolean(settings.anthropicKey) && Boolean(idea.trim())}
        runLabel="Claudeでデザイン"
        progress={settings.anthropicKey ? progress : "コピーしてclaude.aiに貼る（最上位モデル・思考は「高」がおすすめ）→ 返ってきた返答を下に貼る"}
      />
      <div className="card stack">
        <textarea className="code" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="claude.aiの返答をそのまま貼り付け" />
        <div className="row">
          <button className="btn primary" type="button" disabled={!pasted.trim() || checking} onClick={() => adopt(pasted)}>
            {checking ? "確認中…" : "読み込んで保存"}
          </button>
          {progress && !running ? <span className="meta">{progress}</span> : null}
        </div>
        {problems.length > 0 ? <Notice kind="error" title="このままでは使えません" items={problems} /> : null}
      </div>
      <p className="meta">見た目が気に入らなければ、claude.aiの同じチャットで「目をもっと大きく」「線を太く」のように頼んで、返答を貼り直してください。</p>
      </>
      )}
    </>
  );
}

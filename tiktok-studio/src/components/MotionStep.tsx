import { useState } from "react";
import { askClaude, describeClaudeError } from "../lib/claude";
import { extractHtml, lintHtml, loadGraphic, validateGraphic, withExtras, type HostExtras, type ValidationReport } from "../lib/mg";
import type { CharacterSettings } from "../lib/character";
import { buildFixPrompt, buildMotionPrompt, buildPolishPrompt, motionSystemPrompt } from "../lib/prompts";
import type { ApiSettings, Concept, Script, Timeline } from "../lib/types";
import { Field, Notice, PromptBox, StepNav, downloadBlob } from "./common";
import { CriticPanel } from "./CriticPanel";
import { AssetsPanel } from "./AssetsPanel";
import { castOf } from "../lib/manga";
import { unusedAssets, useAssetsRequest, type AssetInfo } from "../lib/assets";
import { TimelineBar } from "./VoiceStep";

interface Props {
  concept: Concept;
  script: Script;
  timeline: Timeline;
  settings: ApiSettings;
  html: string;
  character?: CharacterSettings;
  extras: HostExtras;
  assets: AssetInfo[];
  assetsPrompt: string;
  onAssetsChanged: () => void;
  onHtml: (html: string) => void;
  onBack: () => void;
  onNext: () => void;
}

type Job = "create" | "polish" | "fix";

export function MotionStep({ concept, script, timeline, settings, html, character, extras, assets, assetsPrompt, onAssetsChanged, onHtml, onBack, onNext }: Props) {
  const [running, setRunning] = useState<Job | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [polishRequest, setPolishRequest] = useState("");

  const input = { concept, script, timeline, character, assets: assetsPrompt };
  const motionPrompt = buildMotionPrompt(input);
  const problems = report ? [...report.problems] : [];
  const lint = html.trim() ? lintHtml(html) : [];
  const fixPrompt = buildFixPrompt(html, [...lint, ...problems]);
  const polishPrompt = buildPolishPrompt(input, html, polishRequest);

  const validate = async (source = html) => {
    setChecking(true);
    setReport(null);
    try {
      const loaded = await loadGraphic(source, extras);
      try {
        setReport(validateGraphic(loaded, timeline.duration));
      } finally {
        loaded.dispose();
      }
    } catch (e) {
      setReport({ ok: false, problems: [(e as Error).message], warnings: [], msPerFrame: 0, frozen: null });
    } finally {
      setChecking(false);
    }
  };

  const run = async (job: Job, prompt: string) => {
    setRunning(job);
    setError("");
    setProgress("Claudeが絵コンテを考えています…（数分かかることがあります）");
    try {
      const text = await askClaude({
        settings,
        system: motionSystemPrompt(),
        prompt,
        onProgress: (n) => setProgress(`コードを受信中… ${n.toLocaleString()}文字`)
      });
      const next = extractHtml(text);
      onHtml(next);
      setProgress("生成しました。自動で動作チェックします…");
      await validate(next);
      setProgress("");
    } catch (e) {
      setError(describeClaudeError(e));
      setProgress("");
    } finally {
      setRunning(null);
    }
  };

  const loadDemo = async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}examples/demo.html`);
    const text = await response.text();
    onHtml(text);
    await validate(text);
  };

  return (
    <>
      <h1>④ モーション</h1>
      <p className="lead">
        台本・音声のタイミング・スタイル・TikTokのセーフエリア・書き出し用の技術仕様をすべて詰め込んだ「プロ仕様のプロンプト」を自動で組み立てます。
      </p>

      <TimelineBar timeline={timeline} />
      {timeline.scenes.some((scene) => scene.timingSource === "estimate") ? (
        <Notice kind="warn">音声がまだのシーンは推定タイミングです。音声を作ってからモーションを生成すると、声と動きがぴったり揃います。</Notice>
      ) : null}

      <h2>0. 素材（背景イラスト・小物・Lottie）</h2>
      <details className="card" open={assets.length > 0}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          🖼 素材を使う（任意・{assets.length}個登録済み）— 入れると背景の情報量が一気に増えます
        </summary>
        <div style={{ marginTop: 10 }}>
          <AssetsPanel concept={concept} script={script} assets={assets} cast={castOf(settings.cast)} onChanged={onAssetsChanged} />
        </div>
      </details>

      <h2>1. 生成する</h2>
      <PromptBox
        title="モーショングラフィックス生成プロンプト"
        prompt={motionPrompt}
        onRun={() => run("create", motionPrompt)}
        running={running === "create"}
        canRun={Boolean(settings.anthropicKey) && !running}
        runLabel="Claudeで映像を生成"
        progress={running === "create" ? progress : settings.anthropicKey ? "" : "APIキー未設定：コピーしてclaude.aiに貼り、返ってきたHTMLを下に貼り付けてください"}
      />
      {error ? <Notice kind="error" title="エラー">{" " + error}</Notice> : null}

      <h2>2. HTML</h2>
      <div className="card stack">
        <textarea className="code" value={html} onChange={(e) => onHtml(e.target.value)} placeholder="生成されたHTML（claude.aiの返答をそのまま貼ってもOK。```html部分を自動で取り出します）" />
        <div className="row">
          <button
            className="btn"
            type="button"
            title="コピーしてあるclaude.aiの返答で、HTML欄を丸ごと置き換えます"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (!text.trim()) throw new Error("empty");
                onHtml(text);
                setReport(null);
                setError("");
              } catch {
                setError("クリップボードを読めませんでした。HTML欄をクリックして Ctrl+A → Ctrl+V で貼ってください");
              }
            }}
          >
            📋 貼り付けて置き換え
          </button>
          <button className="btn primary" type="button" disabled={!html.trim() || checking} onClick={() => {
            try {
              const clean = extractHtml(html);
              if (clean !== html) onHtml(clean);
              void validate(clean);
            } catch (e) {
              setReport({ ok: false, problems: [(e as Error).message], warnings: [], msPerFrame: 0, frozen: null });
            }
          }}>
            {checking ? "チェック中…" : "動作チェック"}
          </button>
          <button className="btn" type="button" disabled={!html.trim()} onClick={() => downloadBlob(new Blob([withExtras(html, extras)], { type: "text/html" }), "motion.html")}>
            HTMLを保存
          </button>
          <button
            className="btn ghost danger"
            type="button"
            disabled={!html.trim()}
            onClick={() => {
              if (!confirm("HTML欄を空にしますか？（必要なら先に「HTMLを保存」してください）")) return;
              onHtml("");
              setReport(null);
            }}
          >
            🗑 空にする
          </button>
          <button className="btn ghost" type="button" onClick={loadDemo}>
            デモHTMLで試す
          </button>
        </div>
        {html.trim() && assets.length > 0 && unusedAssets(html, assets).used.length === 0 ? (
          <Notice kind="warn" title="このHTMLは、登録した素材を使っていません">
            <div className="row" style={{ marginTop: 6, flexWrap: "wrap" }}>
              <span className="meta" style={{ flex: 1 }}>
                素材を登録する前に作ったHTMLか、Claude が素材を使わずに書いたHTMLです。「1. 生成する」のプロンプトをコピーし直して新しいチャットで作り直すか、下のボタンで「素材を使って」と磨き込みを頼めます。
              </span>
              <button
                className="btn small"
                type="button"
                onClick={() => {
                  setPolishRequest(useAssetsRequest(assets));
                  document.getElementById("polish")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                素材を使うように直す依頼を入れる
              </button>
            </div>
          </Notice>
        ) : null}
        {report ? (
          report.ok ? (
            <Notice kind="ok" title="✓ 書き出しできます" items={report.warnings}>
              {` 1フレーム平均 ${report.msPerFrame.toFixed(1)}ms`}
            </Notice>
          ) : (
            <Notice kind="error" title="このままでは書き出せません" items={[...report.problems, ...report.warnings]} />
          )
        ) : null}
      </div>

      {html.trim() && (lint.length > 0 || (report && !report.ok)) ? (
        <>
          <h2>3. エラーを直す</h2>
          <PromptBox
            title="修正プロンプト"
            prompt={fixPrompt}
            onRun={() => run("fix", fixPrompt)}
            running={running === "fix"}
            canRun={Boolean(settings.anthropicKey) && !running}
            runLabel="Claudeで直す"
            progress={running === "fix" ? progress : ""}
          />
        </>
      ) : null}

      {html.trim() ? (
        <>
          {report?.ok ? (
            <>
              <h2>3. 批評してもらう（別のClaudeの目で）</h2>
              <CriticPanel input={input} html={html} extras={extras} settings={settings} frozen={report.frozen} onReport={setPolishRequest} />
            </>
          ) : null}
          <h2 id="polish">{report && !report.ok ? "4" : report?.ok ? "4" : "3"}. もっと良くする（磨き込み）</h2>
          <div className="card stack">
            <Field label="直したいところ（批評家のレポートを貼るのがおすすめ。空欄ならClaudeがディレクター目線で弱点を見つけて直します）">
              <textarea value={polishRequest} onChange={(e) => setPolishRequest(e.target.value)} placeholder="例：フックをもっと派手に。3シーン目の数字をカウントアップさせて。字幕を少し大きく。" />
            </Field>
          </div>
          <PromptBox
            title="磨き込みプロンプト"
            prompt={polishPrompt}
            onRun={() => run("polish", polishPrompt)}
            running={running === "polish"}
            canRun={Boolean(settings.anthropicKey) && !running}
            runLabel="Claudeで磨き込む"
            progress={running === "polish" ? progress : ""}
          />
        </>
      ) : null}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="プレビュー＆書き出しへ →" nextDisabled={!html.trim()} />
    </>
  );
}

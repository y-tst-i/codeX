import { useState } from "react";
import { askClaude, describeClaudeError } from "../lib/claude";
import { extractHtml, lintHtml, loadGraphic, validateGraphic, type ValidationReport } from "../lib/mg";
import { buildFixPrompt, buildMotionPrompt, buildPolishPrompt, motionSystemPrompt } from "../lib/prompts";
import type { ApiSettings, Concept, Script, Timeline } from "../lib/types";
import { Field, Notice, PromptBox, StepNav, downloadBlob } from "./common";
import { TimelineBar } from "./VoiceStep";

interface Props {
  concept: Concept;
  script: Script;
  timeline: Timeline;
  settings: ApiSettings;
  html: string;
  onHtml: (html: string) => void;
  onBack: () => void;
  onNext: () => void;
}

type Job = "create" | "polish" | "fix";

export function MotionStep({ concept, script, timeline, settings, html, onHtml, onBack, onNext }: Props) {
  const [running, setRunning] = useState<Job | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [polishRequest, setPolishRequest] = useState("");

  const input = { concept, script, timeline };
  const motionPrompt = buildMotionPrompt(input);
  const problems = report ? [...report.problems] : [];
  const lint = html.trim() ? lintHtml(html) : [];
  const fixPrompt = buildFixPrompt(html, [...lint, ...problems]);
  const polishPrompt = buildPolishPrompt(input, html, polishRequest);

  const validate = async (source = html) => {
    setChecking(true);
    setReport(null);
    try {
      const loaded = await loadGraphic(source);
      try {
        setReport(validateGraphic(loaded, timeline.duration));
      } finally {
        loaded.dispose();
      }
    } catch (e) {
      setReport({ ok: false, problems: [(e as Error).message], warnings: [], msPerFrame: 0 });
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
          <button className="btn primary" type="button" disabled={!html.trim() || checking} onClick={() => {
            try {
              const clean = extractHtml(html);
              if (clean !== html) onHtml(clean);
              void validate(clean);
            } catch (e) {
              setReport({ ok: false, problems: [(e as Error).message], warnings: [], msPerFrame: 0 });
            }
          }}>
            {checking ? "チェック中…" : "動作チェック"}
          </button>
          <button className="btn" type="button" disabled={!html.trim()} onClick={() => downloadBlob(new Blob([html], { type: "text/html" }), "motion.html")}>
            HTMLを保存
          </button>
          <button className="btn ghost" type="button" onClick={loadDemo}>
            デモHTMLで試す
          </button>
        </div>
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
          <h2>{report && !report.ok ? "4" : "3"}. もっと良くする（磨き込み）</h2>
          <div className="card stack">
            <Field label="直したいところ（空欄ならClaudeがディレクター目線で弱点を見つけて直します）">
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

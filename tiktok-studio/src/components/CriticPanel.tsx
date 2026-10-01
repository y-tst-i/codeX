import { useEffect, useState } from "react";
import { askClaude, describeClaudeError } from "../lib/claude";
import { blobToBase64, makeContactSheets, type FrozenReport } from "../lib/frames";
import { loadGraphic } from "../lib/mg";
import { buildCriticPrompt, type MotionPromptInput } from "../lib/prompts";
import type { ApiSettings } from "../lib/types";
import { Notice, PromptBox, downloadBlob } from "./common";

interface Props {
  input: MotionPromptInput;
  html: string;
  settings: ApiSettings;
  frozen: FrozenReport | null;
  /** 批評レポートを磨き込みの依頼欄へ入れる */
  onReport: (report: string) => void;
}

/**
 * 別のClaudeに「完成した画」だけを見せて批評してもらう。
 * 作った本人（同じ会話）に自己採点させないのがポイント。
 */
export function CriticPanel({ input, html, settings, frozen, onReport }: Props) {
  const [sheets, setSheets] = useState<Blob[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [making, setMaking] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const prompt = buildCriticPrompt(input, frozen);

  useEffect(() => {
    const next = sheets.map((blob) => URL.createObjectURL(blob));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [sheets]);

  // HTMLが変わったら古いシートは捨てる
  useEffect(() => setSheets([]), [html]);

  const make = async () => {
    setMaking(true);
    setError("");
    try {
      const loaded = await loadGraphic(html);
      try {
        setSheets(await makeContactSheets((t) => loaded.mg.render(t), loaded.canvas, input.timeline.duration));
      } finally {
        loaded.dispose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMaking(false);
    }
  };

  const critique = async () => {
    setRunning(true);
    setError("");
    try {
      const images = await Promise.all(sheets.map(blobToBase64));
      const text = await askClaude({
        settings,
        system: "あなたは独立した映像批評家です。画に写っていることだけで、辛口かつ具体的に判断します。",
        prompt,
        images,
        onProgress: (n) => setProgress(`批評を受信中… ${n.toLocaleString()}文字`)
      });
      onReport(`# 批評家のレポート\n${text}`);
      setProgress("批評を下の「直したいところ」に入れました。そのまま「磨き込み」を実行してください。");
    } catch (e) {
      setError(describeClaudeError(e));
      setProgress("");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card stack">
      <span className="meta">
        作ったClaudeに自分で採点させると甘くなりがちです。完成した画を0.5秒ごとに並べた画像（コンタクトシート）を、<b>別の新しいチャットのClaude</b>に見せて辛口に批評してもらい、その指摘で磨き込みます。
      </span>
      <div className="row">
        <button className="btn" type="button" disabled={making || !html.trim()} onClick={make}>
          {making ? "作成中…" : sheets.length ? "コンタクトシートを作り直す" : "① コンタクトシートを作る"}
        </button>
        {sheets.map((blob, i) => (
          <button key={i} className="btn small" type="button" onClick={() => downloadBlob(blob, `contact-sheet-${i + 1}.png`)}>
            画像{sheets.length > 1 ? i + 1 : ""}を保存
          </button>
        ))}
      </div>
      {urls.length > 0 ? (
        <div className="row" style={{ alignItems: "flex-start" }}>
          {urls.map((url) => (
            <img key={url} src={url} alt="コンタクトシート" style={{ width: 320, borderRadius: 8, border: "1px solid var(--line)" }} />
          ))}
        </div>
      ) : null}
      {sheets.length > 0 ? (
        <>
          <PromptBox
            title="② 批評プロンプト"
            prompt={prompt}
            onRun={critique}
            running={running}
            canRun={Boolean(settings.anthropicKey)}
            runLabel="別のClaudeに批評させる"
            progress={
              settings.anthropicKey
                ? progress
                : "claude.aiで「新しいチャット」を開き、保存した画像を添付してこのプロンプトを貼る → 返ってきた批評を下の「直したいところ」に貼る"
            }
          />
        </>
      ) : null}
      {error ? <Notice kind="error" title="エラー">{" " + error}</Notice> : null}
    </div>
  );
}

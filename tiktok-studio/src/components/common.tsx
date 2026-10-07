import { useState, type ReactNode } from "react";

export function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn small"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "✓ コピーしました" : label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="meta">{hint}</span> : null}
    </label>
  );
}

export function Notice({ kind = "info", title, items, children }: { kind?: "info" | "warn" | "error" | "ok"; title?: string; items?: string[]; children?: ReactNode }) {
  return (
    <div className={`notice ${kind === "info" ? "" : kind}`}>
      {title ? <b>{title}</b> : null}
      {children}
      {items && items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** 生成プロンプトを見せて、コピー or Claudeで直接実行できる箱 */
export function PromptBox({
  title,
  prompt,
  onRun,
  running,
  runLabel,
  canRun,
  progress
}: {
  title: string;
  prompt: string;
  onRun?: () => void;
  running?: boolean;
  runLabel?: string;
  canRun?: boolean;
  progress?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card prompt-box stack">
      <div className="row">
        <b>{title}</b>
        <span className="meta">{prompt.length.toLocaleString()}文字</span>
        <span className="spacer" />
        <button className="btn small ghost" type="button" onClick={() => setOpen(!open)}>
          {open ? "閉じる" : "中身を見る"}
        </button>
        <CopyButton text={prompt} label="プロンプトをコピー" />
        {onRun ? (
          <button className="btn primary small" type="button" disabled={!canRun || running} onClick={onRun}>
            {running ? "生成中…" : runLabel ?? "Claudeで生成"}
          </button>
        ) : null}
      </div>
      {progress ? <span className="meta">{progress}</span> : null}
      {open ? <textarea className="code" readOnly value={prompt} /> : null}
    </div>
  );
}

export function StepNav({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="row" style={{ marginTop: 24 }}>
      {onBack ? (
        <button className="btn" type="button" onClick={onBack}>
          ← 戻る
        </button>
      ) : null}
      <span className="spacer" />
      {onNext ? (
        <button className="btn primary" type="button" onClick={onNext} disabled={nextDisabled}>
          {nextLabel ?? "次へ →"}
        </button>
      ) : null}
    </div>
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}秒`;
}

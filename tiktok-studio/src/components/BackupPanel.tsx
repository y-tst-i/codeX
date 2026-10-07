import { useRef, useState } from "react";
import { exportBackup, importBackup } from "../lib/backup";
import { Notice, downloadBlob } from "./common";

/** 別のPCへ引っ越すためのバックアップ（書き出し・読み込み） */
export function BackupPanel() {
  const [includeKeys, setIncludeKeys] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const save = async () => {
    setBusy("まとめています…");
    setError("");
    try {
      const { blob, summary } = await exportBackup(includeKeys);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      downloadBlob(blob, `tiktok-studio-backup-${stamp}.zip`);
      setMessage(`保存しました（${summary}）。このZIPを別のPCに移して「読み込む」を押してください。`);
    } catch (e) {
      setError(`保存できませんでした: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm("このPCの作業内容（設定・プロジェクト・ネタ帳・音声・キャラ）を、バックアップの内容で置き換えます。よろしいですか？")) return;
    setBusy("読み込んでいます…");
    setError("");
    try {
      const summary = await importBackup(file);
      alert(`${summary}。画面を読み込み直します。`);
      location.reload();
    } catch (e) {
      setError(`読み込めませんでした: ${(e as Error).message}`);
    } finally {
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="card stack">
      <b>📦 別のPCに引っ越す（バックアップ）</b>
      <span className="meta">
        設定・作業中のプロジェクト・ネタ帳・音声・看板キャラを1つのZIPにまとめます。別のPCでこのツールを開いて「読み込む」を押すと、同じ状態から続けられます。書き出した動画（MP4）は普通のファイルなので、Googleドライブなどで別に移してください。
      </span>
      <label className="row meta">
        <input type="checkbox" style={{ width: "auto" }} checked={includeKeys} onChange={(e) => setIncludeKeys(e.target.checked)} />
        APIキーも含める（ZIPを人に渡したり、ネットに置いたりしないこと。含めない場合、引っ越し先で入れ直してください）
      </label>
      <input ref={inputRef} type="file" accept=".zip,application/zip" style={{ display: "none" }} onChange={(e) => void load(e.target.files?.[0])} />
      <div className="row">
        <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={() => void save()}>
          {busy || "バックアップを保存"}
        </button>
        <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
          バックアップを読み込む
        </button>
      </div>
      {message ? <span className="meta">{message}</span> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}

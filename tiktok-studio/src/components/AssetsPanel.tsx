import { useEffect, useRef, useState } from "react";
import { buildImagePrompt, importAssets, loadNotes, removeAsset, saveNote, type AssetInfo } from "../lib/assets";
import { loadAssets } from "../lib/storage";
import type { Concept, Script } from "../lib/types";
import { Notice, PromptBox } from "./common";

interface Props {
  concept: Concept;
  script: Script;
  assets: AssetInfo[];
  onChanged: () => void;
}

/** 背景イラスト・小物・Lottieアニメを登録する */
export function AssetsPanel({ concept, script, assets, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState(loadNotes);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imagePrompt = buildImagePrompt(concept, script);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    void loadAssets("img:").then((blobs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [key, blob] of Object.entries(blobs)) {
        next[key] = URL.createObjectURL(blob);
        urls.push(next[key]!);
      }
      setThumbs(next);
    });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assets]);

  const add = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const { added, skipped } = await importAssets(files);
      setMessage(`${added.length}個の素材を追加しました${skipped.length ? `（使えなかったファイル：${skipped.join("、")}）` : ""}`);
      onChanged();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="stack">
      <PromptBox
        title="ChatGPTで素材を作る依頼文（背景イラスト・小物）"
        prompt={imagePrompt}
        progress="コピーして ChatGPT（画像生成）に貼る → できた画像（またはZIP）を下に入れる"
      />
      <div
        className="card stack"
        style={dragging ? { outline: "2px dashed var(--pink)", outlineOffset: -6 } : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.json,application/json,.zip,application/zip"
          style={{ display: "none" }}
          onChange={(e) => void add(Array.from(e.target.files ?? []))}
        />
        <div className="row">
          <button className="btn primary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "読み込み中…" : "🖼 素材を追加（画像・Lottie・ZIP）"}
          </button>
          <span className="meta">またはここにドラッグ＆ドロップ。Lottie は LottieFiles などで「Lottie JSON」をダウンロード</span>
        </div>
        {message ? <span className="meta">{message}</span> : null}
        {assets.length === 0 ? (
          <span className="meta">素材はまだありません（なくても動画は作れます。入れると画面の情報量がぐっと増えます）</span>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {assets.map((asset) => (
              <div key={asset.key} className="stack" style={{ gap: 4, border: "1px solid var(--line)", borderRadius: 10, padding: 6 }}>
                <div style={{ height: 120, display: "grid", placeItems: "center", borderRadius: 8, background: "repeating-conic-gradient(#2a2a3c 0 25%, #1c1c2a 0 50%) 0 0 / 16px 16px" }}>
                  {asset.kind === "img" && thumbs[asset.key] ? (
                    <img src={thumbs[asset.key]} alt={asset.name} style={{ maxWidth: "100%", maxHeight: 116, objectFit: "contain" }} />
                  ) : (
                    <span className="meta">🎞 Lottie</span>
                  )}
                </div>
                <b style={{ fontSize: 12, wordBreak: "break-all" }}>{asset.name}</b>
                <input
                  value={notes[asset.name] ?? ""}
                  placeholder="説明（例：夜のカフェ）"
                  onChange={(e) => {
                    saveNote(asset.name, e.target.value);
                    setNotes(loadNotes());
                  }}
                  onBlur={onChanged}
                />
                <button
                  className="btn small ghost danger"
                  type="button"
                  onClick={async () => {
                    await removeAsset(asset);
                    onChanged();
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
        <Notice>
          {" "}背景は bg_01, bg_02 … のようにシーン順の名前にしておくと、動画のClaudeがシーンに合わせて使います。説明を書いておくと、より的確に使ってくれます。素材は次の動画にも残るので、使わなくなったら削除してください。
        </Notice>
      </div>
    </div>
  );
}

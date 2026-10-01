import { useEffect, useRef, useState } from "react";
import { EXPRESSION_LABELS } from "../lib/character";
import { IMAGE_EXPRESSIONS, MOUTHS, MOUTH_LABELS, imageKey } from "../lib/imageCharacter";
import { splitSheet, type SheetPiece } from "../lib/sheet";
import { Notice, downloadBlob } from "./common";

interface Props {
  /** 切り出した1枚を、表の枠（"表情:口"）に登録する */
  onRegister: (key: string, blob: Blob) => Promise<void>;
}

const SLOT_OPTIONS = IMAGE_EXPRESSIONS.flatMap((expression) =>
  MOUTHS.map((mouth) => ({ key: imageKey(expression, mouth), label: `${EXPRESSION_LABELS[expression]}・${MOUTH_LABELS[mouth]}` }))
);

/** 動画で大きく映すには、このくらいの高さ(px)が欲しい */
const GOOD_HEIGHT = 600;

/** キャラクターシート（ポーズや顔が並んだ1枚の画像）を1体ずつに切り分けて、登録できるようにする */
export function SheetSplitter({ onRegister }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState(26);
  const [transparent, setTransparent] = useState(false);
  const [pieces, setPieces] = useState<SheetPiece[]>([]);
  const [slots, setSlots] = useState<Record<number, string>>({});
  const [done, setDone] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 切り出し直したら、古いプレビューURLを片付ける
  useEffect(() => () => pieces.forEach((piece) => URL.revokeObjectURL(piece.url)), [pieces]);

  const run = async (source = file, strength = tolerance, alreadyTransparent = transparent) => {
    if (!source) return;
    setBusy(true);
    setError("");
    try {
      const next = await splitSheet(source, strength, alreadyTransparent);
      setPieces(next);
      setSlots({});
      setDone({});
      if (next.length === 0) setError("切り出せるものが見つかりませんでした。「背景の消し方」を弱めてみてください。");
    } catch (e) {
      setError(`切り出せませんでした: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const register = async (index: number) => {
    const key = slots[index];
    const piece = pieces[index];
    if (!key || !piece) return;
    await onRegister(key, piece.blob);
    setDone((current) => ({ ...current, [index]: key }));
  };

  const saveZip = async () => {
    const { zipSync } = await import("fflate");
    const entries: Record<string, Uint8Array> = {};
    for (const [i, piece] of pieces.entries()) entries[`part_${String(i + 1).padStart(2, "0")}.png`] = new Uint8Array(await piece.blob.arrayBuffer());
    downloadBlob(new Blob([zipSync(entries).slice()], { type: "application/zip" }), "character-parts.zip");
  };

  return (
    <div className="card stack">
      <span className="meta">
        ポーズや顔がたくさん並んだ「キャラクターシート」を1枚入れると、背景を消して1体ずつに切り分けます。使いたいものに「どの枠に入れるか」を選んで登録してください。
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          setFile(picked);
          void run(picked);
          e.target.value = "";
        }}
      />
      <div className="row">
        <button className="btn primary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "切り出し中…" : "✂️ シート画像を選んで切り出す"}
        </button>
        {file ? <span className="meta">{file.name}</span> : null}
      </div>
      <div className="row meta" style={{ flexWrap: "wrap", gap: 12 }}>
        <label className="row" style={{ gap: 6 }}>
          背景の消し方
          <input
            type="range"
            min={8}
            max={60}
            value={tolerance}
            style={{ width: 160 }}
            disabled={transparent}
            onChange={(e) => setTolerance(Number(e.target.value))}
            onMouseUp={() => void run()}
            onTouchEnd={() => void run()}
            onKeyUp={() => void run()}
          />
          {tolerance}（キャラが欠けたら弱く、背景が残ったら強く）
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={transparent}
            onChange={(e) => {
              setTransparent(e.target.checked);
              void run(file, tolerance, e.target.checked);
            }}
          />
          背景はもう透明
        </label>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}

      {pieces.length > 0 ? (
        <>
          <div className="row">
            <span className="meta">{pieces.length}個に分けました。</span>
            <button className="btn small" type="button" onClick={() => void saveZip()}>
              切り出した画像をZIPで保存
            </button>
          </div>
          {pieces.some((piece) => piece.height < GOOD_HEIGHT) ? (
            <Notice kind="warn">
              {` 高さが${GOOD_HEIGHT}px未満の画像は、動画で大きく映すと少しぼやけます。画面の端に小さく出す・リアクションの一瞬に使うのがおすすめ。大きく使いたいポーズは、その1体を画像生成AIに渡して「同じキャラ・同じポーズで、高画質・背景透明で描き直して」と頼むときれいになります。`}
            </Notice>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {pieces.map((piece, i) => (
              <div key={piece.url} className="stack" style={{ gap: 4, border: "1px solid var(--line)", borderRadius: 10, padding: 6 }}>
                <div
                  style={{
                    height: 150,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 8,
                    background: "repeating-conic-gradient(#2a2a3c 0 25%, #1c1c2a 0 50%) 0 0 / 16px 16px"
                  }}
                >
                  <img src={piece.url} alt={`part ${i + 1}`} style={{ maxWidth: "100%", maxHeight: 146, objectFit: "contain" }} />
                </div>
                <span className="meta">
                  {i + 1}. {piece.width}×{piece.height}
                  {piece.height < GOOD_HEIGHT ? "（小さめ）" : ""}
                </span>
                <select value={slots[i] ?? ""} onChange={(e) => setSlots((current) => ({ ...current, [i]: e.target.value }))}>
                  <option value="">（使わない）</option>
                  {SLOT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="btn small" type="button" disabled={!slots[i]} onClick={() => void register(i)}>
                  {done[i] && done[i] === slots[i] ? "✓ 登録しました" : "この枠に登録"}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

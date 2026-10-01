import { useEffect, useRef, useState } from "react";
import type { CharacterSettings } from "../lib/character";
import { EXPRESSION_LABELS } from "../lib/character";
import { checkCharacter } from "../lib/characterHost";
import { IMAGE_EXPRESSIONS, MOUTHS, MOUTH_LABELS, assignSlots, buildImageCharacterScript, collectImages, blobToDataUrl, imageKey, prepareCharacterImage, type MouthState } from "../lib/imageCharacter";
import { deleteCharacterImage, loadCharacterImages, saveCharacterImage } from "../lib/storage";
import { CopyButton, Field, Notice } from "./common";

interface Props {
  saved: CharacterSettings | undefined;
  onChange: (character: CharacterSettings) => void;
  onPreview: (sheet: Blob | null) => void;
}

const ALL_KEYS = IMAGE_EXPRESSIONS.flatMap((expression) => MOUTHS.map((mouth) => imageKey(expression, mouth)));

/** 画像生成AIに渡す依頼文（1枚目＋口違いの編集） */
function imagePrompts(name: string, concept: string): { label: string; text: string }[] {
  const who = concept.trim() || "オリジナルのキャラクター";
  return [
    {
      label: "① 1枚目（口を閉じる）",
      text: `${who}${name ? `（名前：${name}）` : ""}。全身、正面向きの立ちポーズ、腕は体の横。表情は「ふつう」で口を閉じている。背景は真っ白の無地（影や床は描かない）。キャラは画面の中央に大きく、頭から足先まで全部入れる。アニメ調のきれいなイラスト、太めの輪郭線。文字・ロゴは入れない。`
    },
    {
      label: "② 口違い（①の画像を元に編集）",
      text: "この画像とまったく同じキャラ・同じポーズ・同じ構図・同じ大きさ・同じ背景のまま、口だけを変えてください。1枚目：口を半分開ける。2枚目：口を大きく「あ」の形に開ける。顔以外は1ピクセルも変えないでください。"
    },
    {
      label: "③ 表情違い（任意）",
      text: "この画像とまったく同じキャラ・同じポーズ・同じ構図・同じ大きさ・同じ背景のまま、表情だけを「笑顔」に変えてください（口を閉じた版・半開き・大きく開けた版の3枚）。"
    }
  ];
}

export function ImageCharacterPanel({ saved, onChange, onPreview }: Props) {
  const isSavedImage = saved?.kind === "image";
  const [name, setName] = useState(isSavedImage ? saved.name : "");
  const [concept, setConcept] = useState(isSavedImage ? saved.concept : "");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [removeBg, setRemoveBg] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const targetRef = useRef<string>("");
  const bulkRef = useRef<HTMLInputElement | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotes, setBulkNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  // 登録済みの画像を読み込んで表示
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    void loadCharacterImages(ALL_KEYS).then((blobs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [key, blob] of Object.entries(blobs)) {
        next[key] = URL.createObjectURL(blob);
        created.push(next[key]!);
      }
      setUrls(next);
    });
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const keys = Object.keys(urls);

  const choose = (key: string) => {
    targetRef.current = key;
    inputRef.current?.click();
  };

  const upload = async (file: File | undefined) => {
    const key = targetRef.current;
    if (!file || !key) return;
    setBusyKey(key);
    try {
      const blob = await prepareCharacterImage(file, removeBg);
      await saveCharacterImage(key, blob);
      setUrls((current) => ({ ...current, [key]: URL.createObjectURL(blob) }));
      setMessage("");
    } catch (e) {
      setProblems([`画像を読み込めませんでした: ${(e as Error).message}`]);
    } finally {
      setBusyKey(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  /** 複数の画像・ZIPをまとめて登録（ファイル名から表情と口を推測） */
  const bulkUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setProblems([]);
    setBulkNotes([]);
    setMessage("");
    setBulkBusy(true);
    try {
      const images = await collectImages(files);
      if (images.length === 0) {
        setProblems(["画像が見つかりませんでした（PNG / JPG / WebP、またはそれらを入れたZIPを選んでください）"]);
        return;
      }
      const byName = new Map(images.map((image) => [image.name, image.blob]));
      const { assigned, unassigned } = assignSlots(images.map((image) => image.name));
      const failed: string[] = [];
      const done: string[] = [];
      for (const [key, fileName] of Object.entries(assigned)) {
        setBusyKey(key);
        try {
          const blob = await prepareCharacterImage(byName.get(fileName)!, removeBg);
          await saveCharacterImage(key, blob);
          setUrls((current) => ({ ...current, [key]: URL.createObjectURL(blob) }));
          done.push(key);
        } catch (e) {
          failed.push(`${fileName}: ${(e as Error).message}`);
        }
      }
      const summary = IMAGE_EXPRESSIONS.map((expression) => {
        const count = done.filter((key) => key.startsWith(`${expression}:`)).length;
        return count > 0 ? `${EXPRESSION_LABELS[expression]}${count}枚` : "";
      }).filter(Boolean);
      setMessage(`${done.length}枚を登録しました（${summary.join("・")}）。下の表で場所が合っているか確認して、違えばマスをクリックして差し替えてください。`);
      const notes = [
        ...failed.map((f) => `読み込めませんでした → ${f}`),
        ...(unassigned.length > 0 ? [`入る場所がなく使わなかった画像：${unassigned.join("、")}（同じ表情は3枚まで）`] : [])
      ];
      setBulkNotes(notes);
    } catch (e) {
      setProblems([`まとめて登録できませんでした: ${(e as Error).message}`]);
    } finally {
      setBusyKey(null);
      setBulkBusy(false);
      if (bulkRef.current) bulkRef.current.value = "";
    }
  };

  const remove = async (key: string) => {
    await deleteCharacterImage(key);
    setUrls((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const adopt = async () => {
    setProblems([]);
    if (!keys.some((key) => key.startsWith("normal:"))) {
      setProblems(["「ふつう」の画像（少なくとも口を閉じた1枚）が必要です"]);
      return;
    }
    const blobs = await loadCharacterImages(keys);
    const dataUrls: Record<string, string> = {};
    for (const [key, blob] of Object.entries(blobs)) dataUrls[key] = await blobToDataUrl(blob);
    const finalName = name.trim() || "キャラクター";
    const result = await checkCharacter(buildImageCharacterScript(finalName, dataUrls));
    onPreview(result.sheet);
    if (!result.ok) {
      setProblems(result.problems);
      return;
    }
    onChange({ kind: "image", name: finalName, concept, script: "", imageKeys: keys, updatedAt: Date.now() });
    const mouthCount = MOUTHS.filter((mouth) => keys.includes(imageKey("normal", mouth))).length;
    setMessage(
      mouthCount < 3
        ? `保存しました。口の画像が${mouthCount}枚なので、口パクは${mouthCount === 1 ? "しません" : "2段階になります"}。3枚そろえるとはっきり口が動きます。`
        : "保存しました。次の動画から、声に合わせて口が動きます。"
    );
  };

  return (
    <div className="stack">
      <Notice>
        画像生成AIで作った「同じキャラの口違いの画像」を登録すると、ナレーションの声の大きさに合わせて画像を切り替えて口パクします。表情違いも登録すれば、表情も切り替わります。
      </Notice>

      <div className="card stack">
        <div className="grid-2">
          <Field label="名前">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ミルティ" />
          </Field>
          <Field label="キャラの説明（動画のClaudeに伝わります）">
            <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="例：恋愛心理を教える、元気な擬人化うさぎ" />
          </Field>
        </div>
      </div>

      <h3>1. 画像生成AIで画像を作る</h3>
      <div className="card stack">
        {imagePrompts(name, concept).map((p) => (
          <div key={p.label} className="row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <b>{p.label}</b>
              <div className="meta">{p.text}</div>
            </div>
            <CopyButton text={p.text} />
          </div>
        ))}
        <span className="meta">
          コツ：口違い・表情違いは、①の画像をアップロードして「この画像を元に編集して」と頼むと同じキャラのまま作れます。毎回ゼロから生成すると顔や服が変わってしまいます。
        </span>
      </div>

      <h3>2. 画像を登録する</h3>
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
          void bulkUpload(Array.from(e.dataTransfer.files));
        }}
      >
        <label className="row meta">
          <input type="checkbox" style={{ width: "auto" }} checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
          白い背景を自動で透明にする（背景がすでに透明な画像ならオフでもOK）
        </label>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void upload(e.target.files?.[0])} />
        <input
          ref={bulkRef}
          type="file"
          multiple
          accept="image/*,.zip,application/zip"
          style={{ display: "none" }}
          onChange={(e) => void bulkUpload(Array.from(e.target.files ?? []))}
        />
        <div className="row">
          <button className="btn primary" type="button" disabled={bulkBusy} onClick={() => bulkRef.current?.click()}>
            {bulkBusy ? "登録中…" : "📦 まとめて登録（複数画像・ZIP）"}
          </button>
          <span className="meta">またはこの枠に画像・ZIPをドラッグ＆ドロップ</span>
        </div>
        <span className="meta">
          ファイル名で自動で振り分けます：「閉じ」「半開き」「開き」（close / half / open）と「笑顔」「驚き」「考え」「悲しい」（happy / surprised / thinking / sad）。
          名前に何も書いてなければ、ファイル名順（1→2→3）に「ふつう」の閉じ→半開き→全開へ入れます。例：<code>1.png 2.png 3.png</code>、<code>笑顔_閉じ.png</code>
        </span>
        {bulkNotes.length > 0 ? <Notice kind="warn" title="一部の画像は登録していません" items={bulkNotes} /> : null}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 8 }}>
            <thead>
              <tr>
                <th />
                {MOUTHS.map((mouth) => (
                  <th key={mouth} className="meta" style={{ fontWeight: 600 }}>
                    {MOUTH_LABELS[mouth as MouthState]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IMAGE_EXPRESSIONS.map((expression) => (
                <tr key={expression}>
                  <td className="meta" style={{ whiteSpace: "nowrap", paddingRight: 6 }}>
                    {EXPRESSION_LABELS[expression]}
                    {expression === "normal" ? <b style={{ color: "var(--pink)" }}>（必須）</b> : ""}
                  </td>
                  {MOUTHS.map((mouth) => {
                    const key = imageKey(expression, mouth);
                    const url = urls[key];
                    return (
                      <td key={key}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => choose(key)}
                          style={{
                            width: 110,
                            height: 140,
                            borderRadius: 10,
                            border: url ? "1px solid var(--line)" : "2px dashed var(--line)",
                            background: "repeating-conic-gradient(#2a2a3c 0 25%, #1c1c2a 0 50%) 0 0 / 16px 16px",
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            position: "relative"
                          }}
                        >
                          {busyKey === key ? (
                            <span className="meta">処理中…</span>
                          ) : url ? (
                            <img src={url} alt={key} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                          ) : (
                            <span className="meta">＋ 画像</span>
                          )}
                          {url ? (
                            <button
                              className="btn small ghost danger"
                              type="button"
                              style={{ position: "absolute", top: 2, right: 2, padding: "0 6px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                void remove(key);
                              }}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="meta">最低限「ふつう」の3枚（閉じ・半開き・全開）があれば、はっきり口パクします。表情違いは無ければ「ふつう」で代用されます。</span>
        <div className="row">
          <button className="btn primary" type="button" disabled={keys.length === 0} onClick={() => void adopt()}>
            このキャラで保存して使う
          </button>
          {message ? <span className="meta">{message}</span> : null}
        </div>
        {problems.length > 0 ? <Notice kind="error" title="このままでは使えません" items={problems} /> : null}
      </div>
    </div>
  );
}

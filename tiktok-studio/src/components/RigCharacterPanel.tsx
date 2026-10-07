import { useEffect, useRef, useState } from "react";
import type { CharacterDraw, CharacterSettings } from "../lib/character";
import { EXPRESSION_LABELS } from "../lib/character";
import { checkCharacter } from "../lib/characterHost";
import { blobToDataUrl } from "../lib/imageCharacter";
import {
  RIG_EXPRESSIONS,
  RIG_FX_LABELS,
  RIG_PARTS,
  RIG_PART_LABELS,
  RIG_POSE_LABELS,
  RIG_REQUIRED,
  rigCapabilities,
  buildRigCharacterScript,
  collectRigFiles,
  fillMissingPivots,
  parseRigJson,
  rigKey,
  trimPart,
  type RigConfig
} from "../lib/rigCharacter";
import { loadCharacterImages, saveCharacterImage } from "../lib/storage";
import { Field, Notice } from "./common";

interface Props {
  saved: CharacterSettings | undefined;
  onChange: (character: CharacterSettings) => void;
  onPreview: (sheet: Blob | null) => void;
}

/** 動くプレビュー（iframe を使わず、このページの中で描画コードを動かす） */
function useRigPreview(script: string) {
  const [character, setCharacter] = useState<CharacterDraw | null>(null);
  useEffect(() => {
    if (!script) {
      setCharacter(null);
      return;
    }
    let cancelled = false;
    const sandbox = {} as { CHARACTER?: CharacterDraw; MG_ASSETS_READY?: Promise<unknown> };
    // 描画コードは window.CHARACTER に書き込むので、代わりの入れ物を window として渡す
    new Function("window", script)(sandbox);
    void Promise.resolve(sandbox.MG_ASSETS_READY).then(() => {
      if (!cancelled) setCharacter(sandbox.CHARACTER ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [script]);
  return character;
}

export function RigCharacterPanel({ saved, onChange, onPreview }: Props) {
  const isSavedRig = saved?.kind === "rig";
  const [name, setName] = useState(isSavedRig ? saved.name : "");
  const [concept, setConcept] = useState(isSavedRig ? saved.concept : "");
  const [rig, setRig] = useState<RigConfig | null>(isSavedRig ? saved.rig ?? null : null);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [expression, setExpression] = useState("normal");
  const [pose, setPose] = useState("idle");
  const [talking, setTalking] = useState(true);
  const [fx, setFx] = useState<string[]>([]);
  const [walking, setWalking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const character = useRigPreview(script);

  const parts = rig ? Object.keys(rig.offsets) : [];
  const caps = rigCapabilities(parts);

  const rebuild = async (config: RigConfig, displayName: string) => {
    const blobs = await loadCharacterImages(Object.keys(config.offsets).map(rigKey));
    const urls: Record<string, string> = {};
    for (const part of Object.keys(config.offsets)) {
      const blob = blobs[rigKey(part)];
      if (blob) urls[part] = await blobToDataUrl(blob);
    }
    const next = buildRigCharacterScript(displayName || "キャラクター", config, urls);
    setScript(next);
    return next;
  };

  // 保存済みのリグがあれば読み込んでプレビュー
  useEffect(() => {
    if (isSavedRig && saved.rig) void rebuild(saved.rig, saved.name);
  }, []);

  // プレビューのアニメーション
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !character) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      // 話しているふうの口の動き（音節っぽく開閉）
      const mouth = talking ? Math.max(0, Math.sin(t * 11) * 0.55 + Math.sin(t * 4.3) * 0.35 + 0.15) : 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = walking ? canvas.width / 2 + Math.sin(t * 0.8) * canvas.width * 0.18 : canvas.width / 2;
      character.draw(ctx, { x, y: canvas.height - 12, size: canvas.height - 30, t, expression, pose, mouth, look: Math.sin(t * 0.7) * 0.3, fx, walk: walking, flip: walking && Math.cos(t * 0.8) < 0 });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [character, expression, pose, talking, fx, walking]);

  const importFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setProblems([]);
    setMessage("");
    setBusy("読み込み中…");
    try {
      const found = await collectRigFiles(files);
      if (!found.rigJson) throw new Error("rig.json が見つかりません。パーツと一緒に rig.json（関節の位置）も入れてください");
      const { canvas, pivots, anchors, pupilRange } = parseRigJson(found.rigJson);
      const missing: string[] = RIG_REQUIRED.filter((part) => !found.parts[part]);
      const layeredEyes = ["eyes_white", "pupil_L", "pupil_R", "eyes_lids"].every((part) => found.parts[part]);
      if (!found.parts.eyes_open && !layeredEyes) missing.push("eyes_open");
      if (missing.length > 0) throw new Error(`必須のパーツがありません: ${missing.map((p) => `${p}.png`).join(", ")}`);
      const offsets: Record<string, [number, number]> = {};
      const boxes: Record<string, { x: number; y: number; w: number; h: number }> = {};
      const errors: string[] = [];
      const names = Object.keys(found.parts);
      for (const [i, part] of names.entries()) {
        setBusy(`パーツを整えています… ${i + 1}/${names.length}`);
        try {
          const trimmed = await trimPart(found.parts[part]!, canvas);
          await saveCharacterImage(rigKey(part), trimmed.blob);
          offsets[part] = trimmed.offset;
          const bitmap = await createImageBitmap(trimmed.blob);
          boxes[part] = { x: trimmed.offset[0], y: trimmed.offset[1], w: bitmap.width, h: bitmap.height };
        } catch (e) {
          errors.push(`${part}.png: ${(e as Error).message}`);
        }
      }
      const config: RigConfig = { canvas, pivots: fillMissingPivots(pivots, boxes), offsets, anchors, ...(pupilRange ? { pupilRange } : {}) };
      setRig(config);
      await rebuild(config, name);
      const unused = RIG_PARTS.filter((part) => !offsets[part]);
      setMessage(`${Object.keys(offsets).length}個のパーツを読み込みました。${unused.length ? `（無いパーツ：${unused.map((p) => RIG_PART_LABELS[p]).join("・")} → なくても動きます。その動きや漫符は使わないようにします）` : ""}`);
      if (errors.length > 0) setProblems(errors);
    } catch (e) {
      setProblems([(e as Error).message]);
    } finally {
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const adopt = async () => {
    if (!rig) return;
    setProblems([]);
    setBusy("確認中…");
    try {
      const finalName = name.trim() || "キャラクター";
      const finalScript = await rebuild(rig, finalName);
      const result = await checkCharacter(finalScript);
      onPreview(result.sheet);
      if (!result.ok) {
        setProblems(result.problems);
        return;
      }
      onChange({ kind: "rig", name: finalName, concept, script: "", imageKeys: Object.keys(rig.offsets).map(rigKey), rig, updatedAt: Date.now() });
      setMessage("保存しました。次の動画から、このキャラが声に合わせて口パク・まばたき・耳や腕を動かします。");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="stack">
      <Notice>
        頭・体・耳・腕・目・口を別々にした透過PNGと、関節の位置を書いた <code>rig.json</code> を入れると、関節を中心にパーツを動かして「生きているように」動かします。口パク・まばたき・耳ピク・首かしげ・腕のポーズ・体のバウンスはすべて自動です。
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
          void importFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,application/zip,image/png,.json,application/json"
          style={{ display: "none" }}
          onChange={(e) => void importFiles(Array.from(e.target.files ?? []))}
        />
        <div className="row">
          <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
            {busy || "🧩 パーツのZIPを読み込む"}
          </button>
          <span className="meta">rig_parts.zip をそのまま選ぶか、ここにドラッグ＆ドロップ（PNGと rig.json をまとめて選んでもOK）</span>
        </div>
        <details>
          <summary className="meta" style={{ cursor: "pointer" }}>使えるファイル名</summary>
          <div className="meta" style={{ marginTop: 6 }}>
            必須：{RIG_REQUIRED.map((p) => `${p}.png`).join("、")}、eyes_open.png（または eyes_white・pupil_L・pupil_R・eyes_lids）、rig.json
            <br />
            あると良い：{RIG_PARTS.filter((p) => !(RIG_REQUIRED as readonly string[]).includes(p)).map((p) => `${p}.png（${RIG_PART_LABELS[p]}）`).join("、")}
            <br />
            すべて同じ大きさのキャンバスで、重ねると1体の絵になる位置に描かれていること。
          </div>
        </details>
        {message ? <span className="meta">{message}</span> : null}
        {problems.length > 0 ? <Notice kind="error" title="うまく読み込めませんでした" items={problems} /> : null}
      </div>

      {rig ? (
        <div className="card stack">
          <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
            <canvas
              ref={canvasRef}
              width={360}
              height={540}
              style={{ borderRadius: 12, background: "repeating-conic-gradient(#2a2a3c 0 25%, #1c1c2a 0 50%) 0 0 / 20px 20px", maxWidth: "100%" }}
            />
            <div className="stack" style={{ flex: 1, minWidth: 220 }}>
              <Field label="表情">
                <select value={expression} onChange={(e) => setExpression(e.target.value)}>
                  {RIG_EXPRESSIONS.map((ex) => (
                    <option key={ex} value={ex}>
                      {EXPRESSION_LABELS[ex] ?? ex}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ポーズ">
                <select value={pose} onChange={(e) => setPose(e.target.value)}>
                  {caps.poses.map((p) => (
                    <option key={p} value={p}>
                      {RIG_POSE_LABELS[p] ?? p}
                    </option>
                  ))}
                </select>
              </Field>
              {caps.fx.length > 0 ? (
                <div className="row meta" style={{ flexWrap: "wrap", gap: 8 }}>
                  漫符：
                  {caps.fx.map((f) => (
                    <label key={f} className="row" style={{ gap: 4 }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={fx.includes(f)}
                        onChange={(e) => setFx((current) => (e.target.checked ? [...current, f] : current.filter((x) => x !== f)))}
                      />
                      {RIG_FX_LABELS[f]}
                    </label>
                  ))}
                </div>
              ) : null}
              {caps.walk ? (
                <label className="row meta">
                  <input type="checkbox" style={{ width: "auto" }} checked={walking} onChange={(e) => setWalking(e.target.checked)} />
                  歩かせる
                </label>
              ) : null}
              <label className="row meta">
                <input type="checkbox" style={{ width: "auto" }} checked={talking} onChange={(e) => setTalking(e.target.checked)} />
                話しているふうに口を動かす
              </label>
              <span className="meta">
                読み込んだパーツ：{parts.length}個{caps.gaze ? "（黒目が動きます）" : ""}
              </span>
              <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={() => void adopt()}>
                このキャラで保存して使う
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

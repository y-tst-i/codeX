import { useEffect, useRef, useState } from "react";
import { buildImagePrompt, importAssets, loadNotes, removeAsset, saveNote, type AssetInfo } from "../lib/assets";
import { cancelCodex, checkCodex, cleanupCodex, codexFile, codexImagePrompt, codexJob, startCodexImages } from "../lib/codexClient";
import { loadAssets } from "../lib/storage";
import { buildCastSheetPrompt, buildPanelPrompt, castRefName } from "../lib/manga";
import type { CastMember, Concept, Script } from "../lib/types";
import { Notice, PromptBox } from "./common";

interface Props {
  concept: Concept;
  script: Script;
  assets: AssetInfo[];
  /** 漫画ドラマの登場人物（format が manga のときだけ使う） */
  cast: CastMember[];
  onChanged: () => void;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 背景イラスト・小物・Lottieアニメを登録する */
export function AssetsPanel({ concept, script, assets, cast, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState(loadNotes);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imagePrompt = buildImagePrompt(concept, script);

  // Codex（自分のPCの Codex CLI）で自動生成
  const [codexState, setCodexState] = useState<{ id?: string; status: string; error?: string; setup?: boolean }>({ status: "" });
  const manga = concept.format === "manga";
  const panelPrompt = manga ? buildPanelPrompt(script, cast, concept) : { prompt: "", count: 0 };
  const missingRefs = cast.filter((m) => !assets.some((a) => a.name === castRefName(m)));
  const runCodex = async (prompt: string, refs: { name: string; dataUrl: string }[] = []) => {
    setCodexState({ status: "Codex を確認しています…" });
    try {
      const check = await checkCodex();
      if (!check.installed || !check.loggedIn) {
        setCodexState({ status: "", setup: true, error: !check.installed ? "このPCに Codex CLI が入っていません" : "Codex にログインしていません" });
        return;
      }
      const { id } = await startCodexImages(codexImagePrompt(prompt), refs);
      setCodexState({ id, status: "Codex が素材を作り始めました…" });
      const imported = new Set<string>();
      const take = async (names: string[]) => {
        const fresh = names.filter((name) => !imported.has(name));
        if (fresh.length === 0) return;
        fresh.forEach((name) => imported.add(name));
        await importAssets(await Promise.all(fresh.map((name) => codexFile(id, name))));
        onChanged();
      };
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const job = await codexJob(id);
        await take(job.files);
        const last = job.log.filter((line) => !/^\s*$/.test(line)).slice(-1)[0] ?? "";
        if (job.state === "running") {
          setCodexState({ id, status: `生成中… ${imported.size}枚できました（${job.seconds}秒経過）${last ? `｜${last.slice(0, 80)}` : ""}` });
          continue;
        }
        await cleanupCodex(id).catch(() => undefined);
        if (job.state === "done") setCodexState({ status: `完了：${imported.size}枚の素材を追加しました（${job.seconds}秒）` });
        else if (job.state === "cancelled") setCodexState({ status: `中止しました（${imported.size}枚は追加済み）` });
        else setCodexState({ status: "", error: `Codex がエラーで止まりました：${job.log.slice(-3).join(" / ")}` });
        return;
      }
    } catch (e) {
      setCodexState({ status: "", error: (e as Error).message });
    }
  };

  /** コマ絵：登場人物の設定画を参考画像として一緒に渡す */
  const runPanels = async () => {
    const blobs = await loadAssets("img:ref_cast_");
    const refs = await Promise.all(
      cast.filter((m) => blobs[`img:${castRefName(m)}`]).map(async (m) => ({ name: castRefName(m), dataUrl: await toDataUrl(blobs[`img:${castRefName(m)}`]!) }))
    );
    await runCodex(panelPrompt.prompt, refs);
  };
  const codexRunning = Boolean(codexState.id && !codexState.error && codexState.status.startsWith("生成中"));

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
      <div className="card stack">
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button className="btn primary" type="button" disabled={codexRunning} onClick={() => void runCodex(imagePrompt)}>
            🤖 Codexで素材を自動で作る（ChatGPT Plus の枠を使う）
          </button>
          {codexState.id && codexState.status.startsWith("生成中") ? (
            <button className="btn small" type="button" onClick={() => void cancelCodex(codexState.id!)}>
              中止
            </button>
          ) : null}
        </div>
        <span className="meta">
          台本に合った背景（シーンごと）と小物を、Codex が画像生成して自動で素材に登録します。1枚30秒〜1分ほど。できた順に下に並びます。
        </span>
        {manga ? (
          <div className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <b>📖 漫画ドラマの絵</b>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn" type="button" disabled={codexRunning} onClick={() => void runCodex(buildCastSheetPrompt(cast, concept))}>
                🎭 ① 登場人物の設定画を作る（{cast.length}人）
              </button>
              <button className="btn" type="button" disabled={codexRunning || panelPrompt.count === 0} onClick={() => void runPanels()}>
                🎞 ② コマ絵を作る（{panelPrompt.count}コマ）
              </button>
            </div>
            <span className="meta">
              ① で作った設定画（ref_cast_〜）を、② のときに参考画像として Codex に渡すので、どのコマでも同じ見た目の人物になります。設定画は動画には入りません。気に入らない設定画は削除して作り直せます（次の動画にも残るので、一度決めたら使い回し）。
            </span>
            {panelPrompt.count === 0 ? <span className="meta">台本に「漫画ドラマ」のシーンとコマがまだありません（② 台本で作れます）</span> : null}
            {panelPrompt.count > 0 && missingRefs.length > 0 ? (
              <span className="meta">⚠ まだ設定画がない人：{missingRefs.map((m) => m.name).join("、")}（先に ① を押すと見た目がそろいます）</span>
            ) : null}
          </div>
        ) : null}
        {codexState.status ? <span className="meta">{codexState.status}</span> : null}
        {codexState.error ? <Notice kind="error">{" " + codexState.error}</Notice> : null}
        {codexState.setup ? (
          <Notice kind="warn" title="最初に1回だけ準備が必要です">
            <ol className="meta" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li>
                PowerShell で <code>npm install -g @openai/codex</code> を実行
              </li>
              <li>
                続けて <code>codex login</code> を実行し、開いたブラウザで ChatGPT（Plus）のアカウントでログイン
              </li>
              <li>このツールを 起動.bat で開き直して、もう一度ボタンを押す</li>
            </ol>
          </Notice>
        ) : null}
      </div>
      <PromptBox
        title="ChatGPTで素材を作る依頼文（背景イラスト・小物）"
        prompt={imagePrompt}
        progress="Codex を使わない場合：コピーして ChatGPT（画像生成）に貼る → できた画像（またはZIP）を下に入れる"
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
          accept="image/*,.json,application/json,.lottie,.zip,application/zip"
          style={{ display: "none" }}
          onChange={(e) => void add(Array.from(e.target.files ?? []))}
        />
        <div className="row">
          <button className="btn primary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "読み込み中…" : "🖼 素材を追加（画像・Lottie・ZIP）"}
          </button>
          <span className="meta">またはここにドラッグ＆ドロップ。Lottie（動くアニメ素材）は LottieFiles などで「Lottie JSON」か「dotLottie」をダウンロード（任意）</span>
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

import { useState } from "react";
import { importAssets, saveNote } from "../lib/assets";
import { LOTTIE_PRESETS, downloadLottie, lottieAssetName, lottieProblem, planLotties, searchLottie, type LottieHit } from "../lib/lottieClient";
import type { Script } from "../lib/types";
import { Notice } from "./common";

interface Props {
  /** 登録済みの素材名（名前がかぶらないように） */
  taken: string[];
  /** おまかせで選ぶときの手がかり */
  script: Script;
  niche: string;
  onAdded: () => void;
}

/** LottieFiles の無料アニメを、ツールの中で探してワンクリックで素材に入れる */
export function LottieSearch({ taken, script, niche, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LottieHit[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [searched, setSearched] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");

  const run = async (q: string, more = false, note = "") => {
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await searchLottie(q.trim(), more ? next : undefined);
      setHits(more ? [...hits, ...result.hits] : result.hits);
      setNext(result.next);
      setSearched(q.trim());
      if (!more) setLabel(note);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // おまかせ：台本の言葉から探し方を決め、文字・写真入りや重いものを外して、各1個ずつ入れる
  const plan = planLotties(script.scenes, niche);
  const [auto, setAuto] = useState<string[]>([]);
  const [autoBusy, setAutoBusy] = useState(false);
  const runAuto = async () => {
    setAutoBusy(true);
    setError("");
    const log: string[] = [];
    const names = [...taken];
    try {
      for (const pick of plan) {
        const name = lottieAssetName(pick.query, []);
        if (names.includes(name)) {
          log.push(`・${pick.label}：入れ済み`);
          setAuto([...log]);
          continue;
        }
        log.push(`・${pick.label}：探しています…`);
        setAuto([...log]);
        let done = "見つかりませんでした";
        try {
          const { hits: found } = await searchLottie(pick.query);
          for (const hit of found.slice(0, 8)) {
            const file = await downloadLottie(hit, name).catch(() => null);
            if (!file) continue;
            const text = await file.text();
            let data: unknown = null;
            try {
              data = JSON.parse(text);
            } catch {
              continue;
            }
            if (lottieProblem(data, file.size)) continue;
            const result = await importAssets([file]);
            if (result.added.length === 0) continue;
            const scene = script.scenes[pick.scene];
            saveNote(name, `シーン${pick.scene + 1}${scene ? `（${scene.role}「${scene.narration.slice(0, 16)}」）` : ""}で使う：${pick.label}のアニメ`);
            names.push(name);
            done = `追加しました（${name}）`;
            onAdded();
            break;
          }
        } catch (e) {
          done = (e as Error).message;
        }
        log[log.length - 1] = `・${pick.label}：${done}`;
        setAuto([...log]);
      }
    } finally {
      setAutoBusy(false);
    }
  };

  const add = async (hit: LottieHit) => {
    setAdding(hit.id);
    setError("");
    try {
      const name = lottieAssetName(searched, [...taken, ...Object.values(added)]);
      const result = await importAssets([await downloadLottie(hit, name)]);
      if (result.added.length === 0) throw new Error("このアニメは読み込めませんでした（別のものを選んでください）");
      // 動画のClaudeが使いどころを判断できるように、説明を自動で付けておく
      saveNote(name, `${label || searched}のアニメ（${hit.name}）`);
      setAdded((current) => ({ ...current, [hit.id]: name }));
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="card stack">
      <b>✨ 動くアニメ（Lottie）を探して入れる</b>
      <span className="meta">LottieFiles の無料アニメを検索して、「＋ 入れる」で素材に追加できます。ハートが弾ける・紙吹雪・びっくりマークなど、見せ場の飾りに使うと一気にリッチになります。1本の動画に2〜4個がちょうど良いです。</span>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button className="btn primary" type="button" disabled={autoBusy || plan.length === 0} onClick={() => void runAuto()}>
          {autoBusy ? "選んでいます…" : `🎯 台本に合うアニメをおまかせで入れる（${plan.length}個）`}
        </button>
        <span className="meta">候補：{plan.map((p) => `${p.label}（シーン${p.scene + 1}）`).join("、")}</span>
      </div>
      {auto.length > 0 ? <div className="meta" style={{ whiteSpace: "pre-line" }}>{auto.join("\n")}</div> : null}
      <span className="meta">自分で選ぶときは ↓ で検索：</span>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="英語で探すとたくさん出ます（例：heart, confetti, love）" />
        <button className="btn" type="submit" disabled={busy || !query.trim()}>
          {busy ? "検索中…" : "検索"}
        </button>
      </form>
      <div className="chips">
        {LOTTIE_PRESETS.map((preset) => (
          <button
            key={preset.query}
            className="chip"
            type="button"
            onClick={() => {
              setQuery(preset.query);
              void run(preset.query, false, preset.label);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {error ? <Notice kind="error">{" " + error}</Notice> : null}
      {searched && hits.length === 0 && !busy ? <span className="meta">「{searched}」は見つかりませんでした。別の英単語で試してください。</span> : null}
      {hits.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {hits.map((hit) => (
            <div key={hit.id} className="stack" style={{ gap: 4, border: "1px solid var(--line)", borderRadius: 10, padding: 6 }}>
              <div style={{ height: 110, display: "grid", placeItems: "center", background: "#ffffff", borderRadius: 8, overflow: "hidden" }}>
                <img src={hit.gifUrl || hit.imageUrl} alt={hit.name} loading="lazy" style={{ maxWidth: "100%", maxHeight: 108, objectFit: "contain" }} />
              </div>
              <span className="meta" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${hit.name}${hit.author ? ` / ${hit.author}` : ""}`}>
                {hit.name}
              </span>
              {added[hit.id] ? (
                <span className="badge ok">追加済み：{added[hit.id]}</span>
              ) : (
                <button className="btn small" type="button" disabled={adding !== null} onClick={() => void add(hit)}>
                  {adding === hit.id ? "取り込み中…" : "＋ 入れる"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {next && hits.length > 0 ? (
        <button className="btn small ghost" type="button" disabled={busy} onClick={() => void run(searched, true)}>
          もっと見る
        </button>
      ) : null}
      <span className="meta">LottieFiles の無料アニメは「Lottie Simple License」で、商用（収益化した投稿）でも無料で使えます。</span>
    </div>
  );
}

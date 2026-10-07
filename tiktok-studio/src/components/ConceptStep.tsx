import { FONTS, GOALS, HOOKS, NICHE_IDEAS, PALETTES, STYLES } from "../lib/knowledge";
import { applyIdea, type Idea } from "../lib/ideas";
import { MAX_TECHNIQUES, STYLE_TECHNIQUES, TECHNIQUES } from "../lib/techniques";
import { DEFAULT_CAST, castOf } from "../lib/manga";
import type { ApiSettings, CastMember, Concept } from "../lib/types";
import { Field, StepNav } from "./common";
import { IdeasPanel } from "./IdeasPanel";

interface Props {
  concept: Concept;
  settings: ApiSettings;
  ideas: Idea[];
  onIdeas: (ideas: Idea[]) => void;
  onChange: (concept: Concept) => void;
  onSettingsChange: (settings: ApiSettings) => void;
  onNext: () => void;
}

export function ConceptStep({ concept, settings, ideas, onIdeas, onChange, onSettingsChange, onNext }: Props) {
  const set = <K extends keyof Concept>(key: K, value: Concept[K]) => onChange({ ...concept, [key]: value });
  const cast = castOf(settings.cast);
  const setCast = (next: CastMember[]) => onSettingsChange({ ...settings, cast: next });
  const updateMember = (index: number, patch: Partial<CastMember>) => setCast(cast.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  const addMember = () => {
    let n = cast.length + 1;
    while (cast.some((m) => m.id === `p${n}`)) n++;
    setCast([...cast, { id: `p${n}`, name: "", description: "" }]);
  };

  return (
    <>
      <h1>① 企画</h1>
      <p className="lead">「誰に・何を・どう見せるか」を決めます。ここで選んだ内容が、台本とモーションのプロンプトに全部反映されます。</p>
      <p className="meta">🔒 ジャンル・ターゲット・語り口・スタイル・カラー・フォントは「アカウントのらしさ」として保存され、新しい動画にも引き継がれます。テーマとフックの型は毎回変えて試しましょう。</p>

      <div className="card stack">
        <div className="grid-2">
          <Field label="アカウントのジャンル（毎回同じにするのが伸びるコツ）">
            <input value={concept.niche} onChange={(e) => set("niche", e.target.value)} placeholder="例：お金の雑学・節約術" />
          </Field>
          <Field label="ターゲット">
            <input value={concept.target} onChange={(e) => set("target", e.target.value)} placeholder="例：20〜30代の会社員" />
          </Field>
        </div>
        <div className="chips">
          {NICHE_IDEAS.map((idea) => (
            <button key={idea.niche} className="chip" type="button" title={idea.why} onClick={() => set("niche", idea.niche)}>
              {idea.niche}
            </button>
          ))}
        </div>
        <IdeasPanel
          concept={concept}
          settings={settings}
          ideas={ideas}
          onIdeas={onIdeas}
          onPick={(idea) => {
            onChange(applyIdea(concept, idea));
            onIdeas(ideas.map((item) => (item.id === idea.id ? { ...item, used: true } : item)));
          }}
        />
        <Field label="今回の動画のテーマ（ネタ帳から選ぶか、自分で書く）">
          <input value={concept.topic} onChange={(e) => set("topic", e.target.value)} placeholder="例：コンビニのレジ横に置いてある商品の秘密" />
        </Field>
        <Field label="参考情報・入れたい事実（任意）" hint="正確な数字や出典をここに書くと、台本がそれを優先します。">
          <textarea value={concept.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label={`目標の尺：${concept.durationSec}秒`} hint="最初は20〜35秒がおすすめ（完走率を取りやすい）">
            <input type="range" min={12} max={60} step={1} value={concept.durationSec} onChange={(e) => set("durationSec", Number(e.target.value))} />
          </Field>
          <Field label="語り口">
            <input value={concept.tone} onChange={(e) => set("tone", e.target.value)} placeholder="例：テンポよく親しみやすい" />
          </Field>
        </div>
      </div>

      {settings.character ? (
        <label className="row" style={{ marginTop: 14 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={concept.useCharacter !== false} onChange={(e) => set("useCharacter", e.target.checked)} />
          🧸 看板キャラ「{settings.character.name}」を登場させる
        </label>
      ) : null}

      <h2>動画の型</h2>
      <div className="grid-2">
        <button type="button" className={`option ${concept.format !== "manga" ? "selected" : ""}`} onClick={() => set("format", "standard")}>
          <b>いつもの解説</b>
          <small>フック→本題→意外な展開→呼びかけ。キャラとテキストで見せる</small>
        </button>
        <button type="button" className={`option ${concept.format === "manga" ? "selected" : ""}`} onClick={() => set("format", "manga")}>
          <b>📖 漫画ドラマ＋解説</b>
          <small>あるあるの恋愛ドラマを漫画のコマで見せて共感 → 看板キャラが心理学で解説</small>
        </button>
      </div>
      {concept.format === "manga" ? (
        <div className="card stack" style={{ marginTop: 10 }}>
          <b>🎭 ドラマの登場人物</b>
          <p className="meta">毎回同じ人たちが出ると「この2人の話」としてファンがつきます。見た目（髪型・髪色・服）をはっきり書くほど、コマの絵がそろいます。IDは英数字で（設定画のファイル名 ref_cast_ID.png になります）。</p>
          {cast.map((member, index) => (
            <div className="cast-row" key={index}>
              <input value={member.id} placeholder="ID" onChange={(e) => updateMember(index, { id: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} />
              <input value={member.name} placeholder="名前（例：ユウト（彼））" onChange={(e) => updateMember(index, { name: e.target.value })} />
              <input value={member.description} placeholder="年齢・見た目・服・性格" onChange={(e) => updateMember(index, { description: e.target.value })} />
              <button className="btn small ghost danger" type="button" disabled={cast.length <= 1} onClick={() => setCast(cast.filter((_, i) => i !== index))}>
                削除
              </button>
            </div>
          ))}
          <div className="row">
            <button className="btn small" type="button" onClick={addMember}>
              ＋ 人物を追加
            </button>
            <button className="btn small ghost" type="button" onClick={() => setCast(DEFAULT_CAST)}>
              最初の2人に戻す
            </button>
          </div>
        </div>
      ) : null}

      <h2>フックの型（最初の1秒）</h2>
      <div className="grid-3">
        {HOOKS.map((hook) => (
          <button key={hook.id} type="button" className={`option ${concept.hookId === hook.id ? "selected" : ""}`} onClick={() => set("hookId", hook.id)}>
            <b>{hook.name}</b>
            <small>{hook.example}</small>
          </button>
        ))}
      </div>

      <h2>映像スタイル</h2>
      <div className="grid-3">
        {STYLES.map((style) => (
          <button key={style.id} type="button" className={`option ${concept.styleId === style.id ? "selected" : ""}`} onClick={() => set("styleId", style.id)}>
            <b>{style.name}</b>
            <small>{style.summary}</small>
          </button>
        ))}
      </div>

      <h2>演出テクニック（任意・最大{MAX_TECHNIQUES}つ）</h2>
      <p className="meta">
        何も選ばなければ「{STYLES.find((st) => st.id === concept.styleId)?.name}」に合うものをおまかせで使います（
        {(STYLE_TECHNIQUES[concept.styleId] ?? []).map((id) => TECHNIQUES.find((t) => t.id === id)?.name).join("・")}）。
      </p>
      <div className="stack" style={{ gap: 8 }}>
        {[...new Set(TECHNIQUES.map((t) => t.category))].map((category) => (
          <div className="row" key={category} style={{ alignItems: "flex-start" }}>
            <span className="meta" style={{ width: 80, flex: "none", paddingTop: 5 }}>
              {category}
            </span>
            <div className="chips" style={{ flex: 1 }}>
              {TECHNIQUES.filter((t) => t.category === category).map((t) => {
                const selected = concept.techniqueIds?.includes(t.id) ?? false;
                const full = (concept.techniqueIds?.length ?? 0) >= MAX_TECHNIQUES;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="chip"
                    title={t.when}
                    disabled={!selected && full}
                    style={selected ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                    onClick={() =>
                      set(
                        "techniqueIds",
                        selected ? (concept.techniqueIds ?? []).filter((id) => id !== t.id) : [...(concept.techniqueIds ?? []), t.id]
                      )
                    }
                  >
                    {selected ? "✓ " : ""}
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <h2>カラー</h2>
      <div className="grid-3">
        {PALETTES.map((palette) => (
          <button key={palette.id} type="button" className={`option ${concept.paletteId === palette.id ? "selected" : ""}`} onClick={() => set("paletteId", palette.id)}>
            <b>{palette.name}</b>
            <div className="swatches">
              {Object.values(palette.colors).map((color) => (
                <i key={color} style={{ background: color }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <Field label="フォント">
          <select value={concept.fontId} onChange={(e) => set("fontId", e.target.value)}>
            {FONTS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.name} — {font.note}
              </option>
            ))}
          </select>
        </Field>
        <Field label="視聴者にしてほしいこと">
          <select value={concept.goal} onChange={(e) => set("goal", e.target.value as Concept["goal"])}>
            {Object.entries(GOALS).map(([id, goal]) => (
              <option key={id} value={id}>
                {goal.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <StepNav onNext={onNext} nextLabel="台本づくりへ →" nextDisabled={!concept.topic.trim()} />
    </>
  );
}

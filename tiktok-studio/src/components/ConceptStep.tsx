import { FONTS, GOALS, HOOKS, NICHE_IDEAS, PALETTES, STYLES } from "../lib/knowledge";
import { applyIdea, type Idea } from "../lib/ideas";
import { MAX_TECHNIQUES, STYLE_TECHNIQUES, TECHNIQUES } from "../lib/techniques";
import type { ApiSettings, Concept } from "../lib/types";
import { Field, StepNav } from "./common";
import { IdeasPanel } from "./IdeasPanel";

interface Props {
  concept: Concept;
  settings: ApiSettings;
  ideas: Idea[];
  onIdeas: (ideas: Idea[]) => void;
  onChange: (concept: Concept) => void;
  onNext: () => void;
}

export function ConceptStep({ concept, settings, ideas, onIdeas, onChange, onNext }: Props) {
  const set = <K extends keyof Concept>(key: K, value: Concept[K]) => onChange({ ...concept, [key]: value });

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

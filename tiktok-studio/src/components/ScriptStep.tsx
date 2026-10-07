import { useState } from "react";
import { askClaude, describeClaudeError } from "../lib/claude";
import { buildScriptPrompt, characterFor, scriptSystemPrompt } from "../lib/prompts";
import { SCRIPT_JSON_SCHEMA, emptyScene, parseScript } from "../lib/script";
import { estimateSpeechSeconds, spokenLength } from "../lib/timeline";
import { castOf } from "../lib/manga";
import type { ApiSettings, Concept, Panel, Scene, SceneRole, Script } from "../lib/types";
import { Field, Notice, PromptBox, StepNav, formatSeconds } from "./common";

interface Props {
  concept: Concept;
  script: Script | null;
  settings: ApiSettings;
  onChange: (script: Script) => void;
  onBack: () => void;
  onNext: () => void;
}

const ROLES: { id: SceneRole; label: string }[] = [
  { id: "hook", label: "フック" },
  { id: "drama", label: "漫画ドラマ" },
  { id: "body", label: "本題" },
  { id: "twist", label: "意外な展開" },
  { id: "cta", label: "行動の呼びかけ" },
  { id: "loop", label: "ループ" }
];

export function ScriptStep({ concept, script, settings, onChange, onBack, onNext }: Props) {
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const prompt = buildScriptPrompt(concept, characterFor(concept, settings.character), settings.cast);

  const generate = async () => {
    setRunning(true);
    setError("");
    try {
      const text = await askClaude({
        settings,
        system: scriptSystemPrompt(),
        prompt,
        schema: SCRIPT_JSON_SCHEMA,
        onProgress: (n) => setProgress(`受信中… ${n.toLocaleString()}文字`)
      });
      onChange(parseScript(text));
      setProgress("台本ができました。下で自由に直せます。");
    } catch (e) {
      setError(describeClaudeError(e));
      setProgress("");
    } finally {
      setRunning(false);
    }
  };

  const importPasted = () => {
    try {
      onChange(parseScript(pasted));
      setPasted("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateScene = (index: number, patch: Partial<Scene>) => {
    if (!script) return;
    onChange({ ...script, scenes: script.scenes.map((scene, i) => (i === index ? { ...scene, ...patch } : scene)) });
  };
  const moveScene = (index: number, delta: number) => {
    if (!script) return;
    const scenes = [...script.scenes];
    const target = index + delta;
    if (target < 0 || target >= scenes.length) return;
    [scenes[index], scenes[target]] = [scenes[target]!, scenes[index]!];
    onChange({ ...script, scenes });
  };
  const cast = castOf(settings.cast);
  const updatePanel = (index: number, panelIndex: number, patch: Partial<Panel>) => {
    const panels = script?.scenes[index]?.panels ?? [];
    updateScene(index, { panels: panels.map((panel, j) => (j === panelIndex ? { ...panel, ...patch } : panel)) });
  };
  const addPanel = (index: number) => {
    const panels = script?.scenes[index]?.panels ?? [];
    updateScene(index, { panels: [...panels, { cast: [], shot: "", line: "", speaker: "", sfx: "" }] });
  };
  const removePanel = (index: number, panelIndex: number) => updateScene(index, { panels: (script?.scenes[index]?.panels ?? []).filter((_, j) => j !== panelIndex) });

  const removeScene = (index: number) => script && onChange({ ...script, scenes: script.scenes.filter((_, i) => i !== index) });
  const addScene = () => script && onChange({ ...script, scenes: [...script.scenes, emptyScene()] });

  const estimated = script ? script.scenes.reduce((sum, scene) => sum + estimateSpeechSeconds(scene.narration) + 0.12, 0) : 0;
  const diff = estimated - concept.durationSec;

  return (
    <>
      <h1>② 台本</h1>
      <p className="lead">フック→本題→意外な展開→呼びかけ→ループ、の勝ちパターンで台本を作ります。Claudeで直接作るか、プロンプトをコピーしてclaude.aiに貼ってもOKです。</p>

      <PromptBox
        title="台本プロンプト"
        prompt={prompt}
        onRun={generate}
        running={running}
        canRun={Boolean(settings.anthropicKey)}
        runLabel="Claudeで台本を作る"
        progress={settings.anthropicKey ? progress : "APIキー未設定：プロンプトをコピーしてclaude.aiに貼り、返ってきたJSONを下に貼り付けてください"}
      />

      <details className="card" open={!script && !settings.anthropicKey}>
        <summary>claude.aiの返答（JSON）を貼り付けて読み込む</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <textarea className="code" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"title": ..., "scenes": [...]}' />
          <div className="row">
            <button className="btn" type="button" disabled={!pasted.trim()} onClick={importPasted}>
              読み込む
            </button>
          </div>
        </div>
      </details>

      {error ? <Notice kind="error" title="エラー">{" " + error}</Notice> : null}

      {script ? (
        <>
          <h2>台本を仕上げる</h2>
          <div className="card stack">
            <div className="grid-2">
              <Field label="タイトル（管理用）">
                <input value={script.title} onChange={(e) => onChange({ ...script, title: e.target.value })} />
              </Field>
              <Field label="カバー用テキスト（12文字以内）">
                <input value={script.coverText} onChange={(e) => onChange({ ...script, coverText: e.target.value })} />
              </Field>
            </div>
            <Field label="投稿文">
              <textarea value={script.caption} onChange={(e) => onChange({ ...script, caption: e.target.value })} />
            </Field>
            <Field label="ハッシュタグ（スペース区切り）">
              <input value={script.hashtags.join(" ")} onChange={(e) => onChange({ ...script, hashtags: e.target.value.split(/\s+/).filter(Boolean) })} />
            </Field>
          </div>

          <div className="row" style={{ margin: "8px 0 12px" }}>
            <b>シーン {script.scenes.length}個</b>
            <span className="meta">
              推定の尺 {formatSeconds(estimated)}（目標 {concept.durationSec}秒
              {Math.abs(diff) > 3 ? `／${diff > 0 ? "長い" : "短い"}：セリフを${diff > 0 ? "削る" : "足す"}と◎` : "／ちょうど良い"}）
            </span>
          </div>

          <div className="stack">
            {script.scenes.map((scene, index) => {
              const seconds = estimateSpeechSeconds(scene.narration);
              const firstTooLong = index === 0 && seconds > 2.2;
              return (
                <div className="scene" key={scene.id}>
                  <div className="scene-head">
                    <span className={`badge ${scene.role === "hook" ? "hook" : ""}`}>#{index + 1}</span>
                    <select value={scene.role} onChange={(e) => updateScene(index, { role: e.target.value as SceneRole })}>
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <span className="meta">
                      {spokenLength(scene.narration)}文字 ≒ {formatSeconds(seconds)}
                    </span>
                    {firstTooLong ? <span className="badge warn">1文目が長い：2秒以内に</span> : null}
                    <span className="spacer" />
                    <button className="btn small ghost" type="button" onClick={() => moveScene(index, -1)}>
                      ↑
                    </button>
                    <button className="btn small ghost" type="button" onClick={() => moveScene(index, 1)}>
                      ↓
                    </button>
                    <button className="btn small ghost danger" type="button" onClick={() => removeScene(index)}>
                      削除
                    </button>
                  </div>
                  <div className="grid-2">
                    <Field label="セリフ（字幕）">
                      <textarea value={scene.narration} onChange={(e) => updateScene(index, { narration: e.target.value })} />
                    </Field>
                    <Field label="読み上げ用（読み間違い対策。空ならセリフを読む）">
                      <textarea value={scene.reading} onChange={(e) => updateScene(index, { reading: e.target.value })} />
                    </Field>
                    <Field label="画面の大きな文字">
                      <input value={scene.onScreenText} onChange={(e) => updateScene(index, { onScreenText: e.target.value })} />
                    </Field>
                    <Field label="強調語（、区切り）">
                      <input
                        value={scene.emphasis.join("、")}
                        onChange={(e) => updateScene(index, { emphasis: e.target.value.split(/[、,]/).map((s) => s.trim()).filter(Boolean) })}
                      />
                    </Field>
                  </div>
                  <Field label="映像演出メモ">
                    <input value={scene.visual} onChange={(e) => updateScene(index, { visual: e.target.value })} />
                  </Field>
                  {scene.role === "drama" || (scene.panels?.length ?? 0) > 0 ? (
                    <div className="stack" style={{ marginTop: 8 }}>
                      {(scene.panels ?? []).map((panel, j) => (
                        <div className="card stack" key={j}>
                          <div className="row">
                            <b>🎞 コマ {j + 1}</b>
                            {cast.map((member) => (
                              <label key={member.id} className="row" style={{ gap: 4 }}>
                                <input
                                  type="checkbox"
                                  style={{ width: "auto" }}
                                  checked={panel.cast.includes(member.id)}
                                  onChange={(e) =>
                                    updatePanel(index, j, { cast: e.target.checked ? [...panel.cast, member.id] : panel.cast.filter((id) => id !== member.id) })
                                  }
                                />
                                {member.name}
                              </label>
                            ))}
                            <span className="spacer" />
                            <button className="btn small ghost danger" type="button" onClick={() => removePanel(index, j)}>
                              コマを削除
                            </button>
                          </div>
                          <Field label="コマの絵（場所・距離・表情・しぐさ）">
                            <input value={panel.shot} onChange={(e) => updatePanel(index, j, { shot: e.target.value })} />
                          </Field>
                          <div className="grid-3">
                            <Field label="吹き出しのセリフ（12文字以内）">
                              <input value={panel.line} onChange={(e) => updatePanel(index, j, { line: e.target.value })} />
                            </Field>
                            <Field label="話す人">
                              <select value={panel.speaker} onChange={(e) => updatePanel(index, j, { speaker: e.target.value })}>
                                <option value="">（なし）</option>
                                {cast.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="描き文字（ドキッ など）">
                              <input value={panel.sfx} onChange={(e) => updatePanel(index, j, { sfx: e.target.value })} />
                            </Field>
                          </div>
                        </div>
                      ))}
                      <div className="row">
                        <button className="btn small" type="button" onClick={() => addPanel(index)}>
                          ＋ コマを追加
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button className="btn" type="button" style={{ marginTop: 10 }} onClick={addScene}>
            ＋ シーンを追加
          </button>
        </>
      ) : null}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="音声づくりへ →" nextDisabled={!script || script.scenes.length === 0} />
    </>
  );
}

import { useState } from "react";
import { askClaude, describeClaudeError } from "../lib/claude";
import { IDEAS_JSON_SCHEMA, buildIdeasPrompt, ideasSystemPrompt, parseIdeas, type Idea } from "../lib/ideas";
import { HOOKS } from "../lib/knowledge";
import type { ApiSettings, Concept } from "../lib/types";
import { Notice, PromptBox } from "./common";

interface Props {
  concept: Concept;
  settings: ApiSettings;
  ideas: Idea[];
  onIdeas: (ideas: Idea[]) => void;
  onPick: (idea: Idea) => void;
}

/** ネタ帳：Claudeにネタをまとめて出してもらい、1クリックで企画に入れる */
export function IdeasPanel({ concept, settings, ideas, onIdeas, onPick }: Props) {
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [showUsed, setShowUsed] = useState(false);

  const usedTopics = ideas.filter((idea) => idea.used).map((idea) => idea.topic);
  const prompt = buildIdeasPrompt(concept, usedTopics);
  const unused = ideas.filter((idea) => !idea.used);
  const visible = showUsed ? ideas : unused;

  const add = (text: string) => {
    const added = parseIdeas(text);
    onIdeas([...ideas, ...added]);
    return added.length;
  };

  const generate = async () => {
    setRunning(true);
    setError("");
    try {
      const text = await askClaude({
        settings,
        system: ideasSystemPrompt(),
        prompt,
        schema: IDEAS_JSON_SCHEMA,
        onProgress: (n) => setProgress(`受信中… ${n.toLocaleString()}文字`)
      });
      setProgress(`${add(text)}本のネタを追加しました`);
    } catch (e) {
      setError(describeClaudeError(e));
      setProgress("");
    } finally {
      setRunning(false);
    }
  };

  const importPasted = () => {
    try {
      const count = add(pasted);
      setPasted("");
      setError("");
      setProgress(`${count}本のネタを追加しました`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const hookName = (id: string) => HOOKS.find((hook) => hook.id === id)?.name ?? id;

  return (
    <div className="stack">
      <div className="row">
        <b>💡 ネタ帳</b>
        <span className="meta">
          残り {unused.length}本（使用済み {ideas.length - unused.length}本）。ジャンルに合わせてネタを15本ずつ出し、使ったネタは次から出ないようにします。
        </span>
      </div>

      <PromptBox
        title="ネタ出しプロンプト"
        prompt={prompt}
        onRun={generate}
        running={running}
        canRun={Boolean(settings.anthropicKey)}
        runLabel="Claudeでネタを15本出す"
        progress={settings.anthropicKey ? progress : progress || "コピーしてclaude.aiに貼り、返ってきたJSONを下に貼り付けてください"}
      />

      {!settings.anthropicKey ? (
        <div className="stack">
          <textarea className="code" style={{ minHeight: 90 }} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='claude.aiの返答（{"ideas": [...]}）をここに貼り付け' />
          <div className="row">
            <button className="btn" type="button" disabled={!pasted.trim()} onClick={importPasted}>
              ネタ帳に追加
            </button>
          </div>
        </div>
      ) : null}

      {error ? <Notice kind="error" title="エラー">{" " + error}</Notice> : null}

      {visible.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          {visible.map((idea) => (
            <div className="scene row" key={idea.id} style={{ opacity: idea.used ? 0.5 : 1 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <b>{idea.topic}</b>
                <div className="meta">
                  <span className="badge">{hookName(idea.hookId)}</span> 「{idea.hookLine}」— {idea.why}
                </div>
              </div>
              <button className="btn small primary" type="button" onClick={() => onPick(idea)}>
                {idea.used ? "もう一度使う" : "これで作る"}
              </button>
              <button className="btn small ghost danger" type="button" onClick={() => onIdeas(ideas.filter((item) => item.id !== idea.id))}>
                削除
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {ideas.length > unused.length ? (
        <label className="row meta">
          <input type="checkbox" style={{ width: "auto" }} checked={showUsed} onChange={(e) => setShowUsed(e.target.checked)} /> 使用済みのネタも表示
        </label>
      ) : null}
    </div>
  );
}

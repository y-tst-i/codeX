import { useEffect, useMemo, useState, type FormEvent } from "react";
import { io } from "socket.io-client";
import type { HostView } from "../server/game-engine/views.js";
import { stateLabel } from "../shared/state-labels.js";
import type { HostCommand, PendingAnswer, StatKey, TeamId, TeamState } from "../shared/types.js";
import { STAT_KEYS, TEAM_IDS } from "../shared/types.js";
import { ApiError, createGame, loadHost, sendHostCommand, type HostSession } from "./api.js";

const SESSION_KEY = "island7-host-session-v1";

const STAT_LABELS: Record<StatKey, string> = {
  protection: "🛡 防護",
  drainage: "💧 排水",
  access: "🛣 アクセス",
  lifeline: "⚡ ライフライン"
};

function readStoredSession(): HostSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as HostSession : null;
  } catch {
    return null;
  }
}

function answerSummary(answer: PendingAnswer | undefined, products: HostView["products"]): string {
  if (!answer) return "未入力";
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  if (answer.kind === "starter") return productName(answer.productId);
  if (answer.kind === "tutorialBuild") return `${STAT_LABELS[answer.stat]}を整備`;
  if (answer.kind === "day2") return answer.choice === "parts" ? "部品を回収" : "センサーを復旧";
  if (answer.kind === "day4") return answer.choice === "data" ? "観測データを復旧" : "積荷を回収";
  if (answer.kind === "finalChoice") return answer.emergencyProductId ? `${productName(answer.emergencyProductId)}を緊急設置` : "このまま耐える";
  const action = answer.action;
  if (action.kind === "beach") return "漂着海岸を探索";
  if (action.kind === "yard") return `${productName(action.productId)}を取得`;
  if (action.kind === "grc") return `${productName(action.productId)}を取得・即設置`;
  if (action.kind === "build") return `${STAT_LABELS[action.stat]}を整備`;
  if (action.kind === "install") return `${productName(action.productId)}を設置`;
  return "待機";
}

interface SetupFormState {
  islandA: string;
  membersA: string;
  islandB: string;
  membersB: string;
  seed: string;
}

function SetupScreen({ onCreated }: { onCreated: (session: HostSession, view: HostView) => void }) {
  const [form, setForm] = useState<SetupFormState>({
    islandA: "あお島",
    membersA: "メンバーA1\nメンバーA2\nメンバーA3",
    islandB: "みどり島",
    membersB: "メンバーB1\nメンバーB2\nメンバーB3",
    seed: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const members = (value: string) => value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      const result = await createGame({
        A: { islandName: form.islandA, memberNames: members(form.membersA) },
        B: { islandName: form.islandB, memberNames: members(form.membersB) }
      }, form.seed);
      onCreated({
        gameId: result.gameId,
        adminToken: result.credentials.adminToken,
        teamCodes: result.credentials.teamCodes
      }, result.view);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ゲームを作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="setup-shell">
      <section className="hero-card">
        <p className="eyebrow">HOST CONTROL / GATE 2</p>
        <h1>ISLAND 7</h1>
        <p>2つの島を登録して、0日目から進行を始めます。</p>
      </section>
      <form className="setup-form" onSubmit={(event) => void submit(event)}>
        {(["A", "B"] as const).map((id) => (
          <fieldset key={id}>
            <legend>島{id}</legend>
            <label>島の名前<input value={id === "A" ? form.islandA : form.islandB} onChange={(event) => setForm({ ...form, [id === "A" ? "islandA" : "islandB"]: event.target.value })} /></label>
            <label>メンバー表示名（1行に1名、3〜4名）<textarea rows={4} value={id === "A" ? form.membersA : form.membersB} onChange={(event) => setForm({ ...form, [id === "A" ? "membersA" : "membersB"]: event.target.value })} /></label>
          </fieldset>
        ))}
        <label>確認用seed（空欄なら自動生成）<input value={form.seed} onChange={(event) => setForm({ ...form, seed: event.target.value })} /></label>
        {error && <p className="error-banner">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "作成中…" : "ゲームを作成"}</button>
      </form>
    </main>
  );
}

function TeamSummary({ team, data }: { team: TeamState; data: HostView }) {
  const productName = (id: string) => data.products.find((product) => product.id === id)?.name ?? id;
  const captain = team.memberNames[team.decisionCaptainIndex] ?? "—";
  return (
    <article className={`team-card team-${team.id.toLowerCase()}`}>
      <header><div><span className="team-chip">島{team.id}</span><h2>{team.islandName}</h2></div><strong className="hp">HP {Math.max(0, team.hpInternal)}</strong></header>
      <p className="captain">今日の決定担当：{captain}</p>
      <div className="stat-grid">{STAT_KEYS.map((stat) => <div key={stat}><span>{STAT_LABELS[stat]}</span><strong>Lv.{team.stats[stat]}</strong></div>)}</div>
      <div className="resource-row"><span>資材 <b>{team.materials}</b></span><span>GRC <b>{team.grcAcquiredCount}/2</b></span><span>緊急設置 <b>{team.emergencyInstallUsed ? "使用済" : "未使用"}</b></span></div>
      <div className="product-list"><b>所持：</b>{team.ownedNormalProductIds.length ? team.ownedNormalProductIds.map(productName).join("、") : "なし"}</div>
      <div className="product-list"><b>設置済：</b>{[...team.installedNormalProductIds, ...team.installedGrcProductIds].length ? [...team.installedNormalProductIds, ...team.installedGrcProductIds].map(productName).join("、") : "なし"}</div>
    </article>
  );
}

function AnswerButtons({ teamId, view, onSubmit, busy }: { teamId: TeamId; view: HostView; onSubmit: (teamId: TeamId, answer: PendingAnswer) => void; busy: boolean }) {
  const kind = view.answerKind;
  const team = view.state.teams[teamId];
  const buttons: Array<{ key: string; label: string; answer: PendingAnswer }> = [];
  if (kind === "starter") {
    for (const product of view.products.filter((item) => item.starter)) buttons.push({ key: product.id, label: product.name, answer: { kind: "starter", productId: product.id } });
  } else if (kind === "tutorialBuild") {
    for (const stat of STAT_KEYS) buttons.push({ key: stat, label: STAT_LABELS[stat], answer: { kind: "tutorialBuild", stat } });
  } else if (kind === "day2") {
    buttons.push(
      { key: "parts", label: "部品を回収（資材+2）", answer: { kind: "day2", choice: "parts" } },
      { key: "sensor", label: "センサーを復旧（資材+1・情報）", answer: { kind: "day2", choice: "sensor" } }
    );
  } else if (kind === "day4") {
    buttons.push(
      { key: "data", label: "観測データを復旧", answer: { kind: "day4", choice: "data" } },
      { key: "cargo", label: "積荷を回収（資材+2）", answer: { kind: "day4", choice: "cargo" } }
    );
  } else if (kind === "normalAction") {
    for (const option of view.legalActions[teamId] ?? []) buttons.push({ key: option.id, label: option.label, answer: { kind: "normalAction", action: option.action } });
  } else if (kind === "finalChoice") {
    buttons.push({ key: "endure", label: "このまま耐える", answer: { kind: "finalChoice", emergencyProductId: null } });
    if (!team.emergencyInstallUsed) {
      for (const productId of team.ownedNormalProductIds) {
        const name = view.products.find((product) => product.id === productId)?.name ?? productId;
        buttons.push({ key: productId, label: `${name}を緊急設置`, answer: { kind: "finalChoice", emergencyProductId: productId } });
      }
    }
  }
  if (!kind) return null;
  const current = view.state.pendingAnswers[teamId];
  return (
    <section className="answer-card">
      <div><span className="team-chip">島{teamId}</span><strong>{team.islandName}</strong></div>
      <p className={current ? "answer-current answered" : "answer-current"}>現在：{answerSummary(current, view.products)}</p>
      <div className="choice-grid">{buttons.map((button) => <button type="button" key={button.key} disabled={busy} onClick={() => onSubmit(teamId, button.answer)}>{button.label}</button>)}</div>
    </section>
  );
}

interface ManualDraft {
  teamId: TeamId;
  hpInternal: string;
  materials: string;
  protection: string;
  drainage: string;
  access: string;
  lifeline: string;
  owned: string;
  installed: string;
  grc: string;
  stateId: string;
}

function draftFromTeam(team: TeamState, stateId: string): ManualDraft {
  return {
    teamId: team.id,
    hpInternal: String(team.hpInternal),
    materials: String(team.materials),
    protection: String(team.stats.protection),
    drainage: String(team.stats.drainage),
    access: String(team.stats.access),
    lifeline: String(team.stats.lifeline),
    owned: team.ownedNormalProductIds.join(","),
    installed: team.installedNormalProductIds.join(","),
    grc: team.installedGrcProductIds.join(","),
    stateId
  };
}

function ManualCorrection({ view, busy, onCommand }: { view: HostView; busy: boolean; onCommand: (command: HostCommand) => void }) {
  const [draft, setDraft] = useState(() => draftFromTeam(view.state.teams.A, view.state.stateId));
  useEffect(() => setDraft(draftFromTeam(view.state.teams[draft.teamId], view.state.stateId)), [view.state.revision]);
  const updateTeam = (teamId: TeamId) => setDraft(draftFromTeam(view.state.teams[teamId], view.state.stateId));
  const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!window.confirm("表示した変更内容をサーバーへ反映し、監査ログへ記録します。よろしいですか？")) return;
    onCommand({
      type: "MANUAL_CORRECTION",
      teamId: draft.teamId,
      stateId: draft.stateId,
      patch: {
        hpInternal: Number(draft.hpInternal),
        materials: Number(draft.materials),
        stats: {
          protection: Number(draft.protection),
          drainage: Number(draft.drainage),
          access: Number(draft.access),
          lifeline: Number(draft.lifeline)
        },
        ownedNormalProductIds: list(draft.owned),
        installedNormalProductIds: list(draft.installed),
        installedGrcProductIds: list(draft.grc)
      }
    });
  }
  return (
    <details className="manual-panel">
      <summary>緊急用｜手動修正</summary>
      <form onSubmit={submit}>
        <label>対象<select value={draft.teamId} onChange={(event) => updateTeam(event.target.value as TeamId)}><option value="A">島A</option><option value="B">島B</option></select></label>
        <div className="manual-grid">
          <label>内部HP<input type="number" value={draft.hpInternal} onChange={(event) => setDraft({ ...draft, hpInternal: event.target.value })} /></label>
          <label>資材<input type="number" min="0" value={draft.materials} onChange={(event) => setDraft({ ...draft, materials: event.target.value })} /></label>
          {STAT_KEYS.map((stat) => <label key={stat}>{STAT_LABELS[stat]}<input type="number" min="0" max="7" value={draft[stat]} onChange={(event) => setDraft({ ...draft, [stat]: event.target.value })} /></label>)}
        </div>
        <label>所持一般製品ID（カンマ区切り）<input value={draft.owned} onChange={(event) => setDraft({ ...draft, owned: event.target.value })} /></label>
        <label>設置済一般製品ID（カンマ区切り）<input value={draft.installed} onChange={(event) => setDraft({ ...draft, installed: event.target.value })} /></label>
        <label>設置済GRC ID（カンマ区切り）<input value={draft.grc} onChange={(event) => setDraft({ ...draft, grc: event.target.value })} /></label>
        <label>状態ID<input value={draft.stateId} onChange={(event) => setDraft({ ...draft, stateId: event.target.value })} /></label>
        <button type="submit" disabled={busy}>確認して修正</button>
      </form>
    </details>
  );
}

export function HostApp() {
  const [session, setSession] = useState<HostSession | null>(() => readStoredSession());
  const [view, setView] = useState<HostView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [timerDisplay, setTimerDisplay] = useState(120);

  useEffect(() => {
    if (!session) return;
    void loadHost(session).then(setView).catch((cause) => setError(cause instanceof Error ? cause.message : "前回ゲームを読み込めませんでした。"));
    const socket = io({ auth: { role: "host", gameId: session.gameId, adminToken: session.adminToken } });
    socket.on("state:update", (next: HostView) => setView(next));
    socket.on("error:domain", (payload: { error?: string }) => setError(payload.error ?? "リアルタイム接続に失敗しました。"));
    return () => { socket.disconnect(); };
  }, [session]);

  useEffect(() => {
    if (!view) return;
    setTimerDisplay(view.timerRemainingSeconds);
    if (!view.state.timerRunning) return;
    const started = Date.now();
    const base = view.timerRemainingSeconds;
    const timer = window.setInterval(() => setTimerDisplay(Math.max(0, base - Math.floor((Date.now() - started) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [view?.state.revision]);

  const title = useMemo(() => view ? stateLabel(view.state.stateId) : "読込中", [view]);

  function created(nextSession: HostSession, nextView: HostView): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setView(nextView);
  }

  async function runCommand(command: HostCommand | { type: "UNDO" }): Promise<void> {
    if (!session || !view || busy) return;
    setBusy(true);
    setError("");
    try {
      setView(await sendHostCommand(session, view.state.revision, command));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "STALE_REVISION") {
        setView(await loadHost(session));
      }
      setError(cause instanceof Error ? cause.message : "操作を反映できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  if (!session) return <SetupScreen onCreated={created} />;
  if (!view) return <main className="loading"><h1>ISLAND 7</h1><p>{error || "前回ゲームを読み込んでいます…"}</p><button onClick={() => { localStorage.removeItem(SESSION_KEY); setSession(null); }}>新しく作成する</button></main>;

  const state = view.state;
  return (
    <main className="host-shell">
      <header className="host-header">
        <div><p className="eyebrow">FACILITATOR CONTROL</p><h1>{title}</h1><code>{state.stateId} / revision {state.revision}</code></div>
        <div className="status-stack"><span className={`status-pill status-${state.status}`}>{state.status === "paused" ? "一時停止中" : state.status === "finished" ? "完了" : "進行中"}</span><span>最終保存 {new Date(state.updatedAt).toLocaleTimeString("ja-JP")}</span></div>
      </header>

      {error && <div className="error-banner">{error}<button onClick={() => setError("")}>閉じる</button></div>}

      <section className="credential-bar">
        <span>ゲームID <b>{session.gameId}</b></span><span>島A参加コード <b>{session.teamCodes.A}</b></span><span>島B参加コード <b>{session.teamCodes.B}</b></span>
      </section>

      <section className="team-layout">{TEAM_IDS.map((id) => <TeamSummary key={id} team={state.teams[id]} data={view} />)}</section>

      {view.answerKind && <section className="decision-section"><div className="section-heading"><p className="eyebrow">代理入力</p><h2>両チームの回答</h2></div>{TEAM_IDS.map((id) => <AnswerButtons key={id} teamId={id} view={view} busy={busy} onSubmit={(teamId, answer) => void runCommand({ type: "SUBMIT_ANSWER", teamId, answer })} />)}</section>}

      {state.lastResultMessages.length > 0 && <section className="result-panel"><h2>直近の結果</h2>{state.lastResultMessages.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}</section>}

      {state.status === "finished" && <section className="ending-panel"><h2>8日目｜救助結果</h2><p><strong>{view.gameResult?.label}</strong></p><div className="outcome-grid">{TEAM_IDS.map((id) => { const outcome = view.outcomes[id]; return <div key={id}><strong>{state.teams[id].islandName}</strong><span>HP {outcome?.displayHp}</span><b>{outcome?.grade}｜{outcome?.gradeLabel}</b></div>; })}</div></section>}

      <section className="control-dock">
        <div className="timer-box"><span>進行タイマー</span><strong>{String(Math.floor(timerDisplay / 60)).padStart(2, "0")}:{String(timerDisplay % 60).padStart(2, "0")}</strong><div><button onClick={() => void runCommand({ type: state.timerRunning ? "TIMER_STOP" : "TIMER_START" })}>{state.timerRunning ? "停止" : "開始"}</button><button onClick={() => void runCommand({ type: "TIMER_ADJUST", deltaSeconds: 30 })}>+30秒</button><button onClick={() => void runCommand({ type: "TIMER_ADJUST", deltaSeconds: -30 })}>-30秒</button><button onClick={() => void runCommand({ type: "TIMER_RESET", seconds: 120 })}>2分へ戻す</button></div></div>
        <div className="main-controls"><button className="secondary-button" disabled={busy || state.status === "finished"} onClick={() => void runCommand({ type: state.status === "paused" ? "RESUME" : "PAUSE" })}>{state.status === "paused" ? "進行を再開" : "一時停止"}</button><button className="danger-button" disabled={busy} onClick={() => { if (window.confirm("直前の確定操作前へ、状態全体を戻しますか？")) void runCommand({ type: "UNDO" }); }}>一手戻し</button><button className="primary-button" disabled={busy || state.status === "paused" || state.status === "finished"} onClick={() => void runCommand({ type: "ADVANCE" })}>{busy ? "反映中…" : view.answerKind ? "回答を締め切って次へ" : "次の状態へ"}</button></div>
      </section>

      <ManualCorrection view={view} busy={busy} onCommand={(command) => void runCommand(command)} />
    </main>
  );
}

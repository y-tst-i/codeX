import type { GameData } from "../../shared/game-data-schema.js";
import type {
  GameState,
  GameResult,
  HostCommand,
  ManualTeamPatch,
  PendingAnswer,
  StatKey,
  TeamId,
  TeamOutcome,
  TeamState
} from "../../shared/types.js";
import { STAT_KEYS, TEAM_IDS } from "../../shared/types.js";
import { actionsEqual, getLegalNormalActions, getVisibleGrcProductIds } from "./legal-actions.js";
import { answerKindForState, nextStateId, STATE_IDS, stateDay, stateTimeSlot } from "./state-sequence.js";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code = "DOMAIN_ERROR"
  ) {
    super(message);
    this.name = "DomainError";
  }
}

function productById(data: GameData, productId: string) {
  const product = data.products.find((candidate) => candidate.id === productId);
  if (!product) throw new DomainError(`不明な製品IDです: ${productId}`);
  return product;
}

function addLog(
  state: GameState,
  team: TeamState,
  now: string,
  type: string,
  description: string,
  values: { hpDelta?: number; materialsDelta?: number } = {}
): void {
  team.actionHistory.push({
    id: `${team.id}-${state.revision}-${team.actionHistory.length + 1}`,
    at: now,
    day: state.day,
    stateId: state.stateId,
    type,
    description,
    ...values
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function applyStatDelta(team: TeamState, delta: Partial<Record<StatKey, number>>, data: GameData): void {
  for (const stat of STAT_KEYS) {
    const change = delta[stat] ?? 0;
    team.stats[stat] = clamp(team.stats[stat] + change, 0, data.limits.statMax);
  }
}

export function installNormalProduct(
  state: GameState,
  teamId: TeamId,
  productId: string,
  data: GameData,
  now: string,
  options: { emergency?: boolean; requireOwned?: boolean } = {}
): void {
  const team = state.teams[teamId];
  const product = productById(data, productId);
  if (product.category !== "normal") throw new DomainError("一般製品以外はこの操作で設置できません。");
  if (team.installedNormalProductIds.includes(productId)) throw new DomainError("同じ製品は重複設置できません。");

  const requireOwned = options.requireOwned ?? true;
  if (requireOwned && !team.ownedNormalProductIds.includes(productId)) {
    throw new DomainError("所持していない製品は設置できません。");
  }
  if (requireOwned) {
    team.ownedNormalProductIds = team.ownedNormalProductIds.filter((id) => id !== productId);
  }

  team.installedNormalProductIds.push(productId);
  applyStatDelta(team, product.statDelta, data);
  if (product.hpRecovery > 0) {
    team.hpInternal = Math.min(data.limits.hpMax, team.hpInternal + product.hpRecovery);
  }
  if (!options.emergency && product.preparedReductionPhase && product.preparedReduction > 0 && state.day <= 6) {
    if (!team.preparedReductionPhaseIds.includes(product.preparedReductionPhase)) {
      team.preparedReductionPhaseIds.push(product.preparedReductionPhase);
    }
  }
  addLog(state, team, now, options.emergency ? "emergency_install" : "install", `${product.name}を設置`, {
    hpDelta: product.hpRecovery || undefined
  });
}

function acquireGrc(state: GameState, teamId: TeamId, productId: string, data: GameData, now: string): void {
  const team = state.teams[teamId];
  const product = productById(data, productId);
  if (product.category !== "grc") throw new DomainError("GRC製品以外は高台で取得できません。");
  if (team.grcAcquiredCount >= data.grc.acquireMax) throw new DomainError("GRC取得上限に達しています。");
  if (!getVisibleGrcProductIds(state, teamId, data).includes(productId)) throw new DomainError("現在のGRC候補ではありません。");
  if (team.installedGrcProductIds.includes(productId)) throw new DomainError("同じGRCは重複取得できません。");

  team.grcQueue = team.grcQueue.filter((id) => id !== productId);
  team.installedGrcProductIds.push(productId);
  team.grcAcquiredCount += 1;
  applyStatDelta(team, product.statDelta, data);
  addLog(state, team, now, "grc", `${product.name}を取得し即設置`);
}

function applyDamage(state: GameState, team: TeamState, damage: number, now: string, description: string): void {
  const applied = Math.max(0, damage);
  team.hpInternal -= applied;
  team.maxDamageTaken = Math.max(team.maxDamageTaken, applied);
  addLog(state, team, now, "damage", description, { hpDelta: -applied });
}

export function damageFromShortage(shortage: number, data: GameData): number {
  if (shortage <= 0) return data.damageByShortage["0"];
  if (shortage === 1) return data.damageByShortage["1"];
  if (shortage === 2) return data.damageByShortage["2"];
  if (shortage === 3) return data.damageByShortage["3"];
  if (shortage === 4) return data.damageByShortage["4"];
  return data.damageByShortage["5+"];
}

export function getRemainingTimerSeconds(state: GameState, now = new Date().toISOString()): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timerSeconds;
  const elapsed = Math.floor((Date.parse(now) - Date.parse(state.timerStartedAt)) / 1000);
  return Math.max(0, state.timerSeconds - Math.max(0, elapsed));
}

function validateAnswer(state: GameState, teamId: TeamId, answer: PendingAnswer, data: GameData): void {
  const expected = answerKindForState(state.stateId);
  if (!expected) throw new DomainError("現在は回答を受け付ける状態ではありません。");
  if (answer.kind !== expected) throw new DomainError(`現在必要な回答は${expected}です。`);
  const team = state.teams[teamId];

  if (answer.kind === "starter") {
    const product = productById(data, answer.productId);
    if (!product.starter || product.category !== "normal") throw new DomainError("スターター3製品から選んでください。");
  } else if (answer.kind === "tutorialBuild") {
    if (!STAT_KEYS.includes(answer.stat)) throw new DomainError("整備対象の能力が不正です。");
  } else if (answer.kind === "normalAction") {
    const legal = getLegalNormalActions(state, teamId, data).some((option) => actionsEqual(option.action, answer.action));
    if (!legal) throw new DomainError("現在は選べない行動です。");
  } else if (answer.kind === "finalChoice" && answer.emergencyProductId !== null) {
    if (team.emergencyInstallUsed || data.final.emergencyInstallMax < 1) {
      throw new DomainError("緊急設置枠は使用済みです。");
    }
    if (!team.ownedNormalProductIds.includes(answer.emergencyProductId)) {
      throw new DomainError("緊急設置できる所持製品ではありません。");
    }
  }
}

function requireBothAnswers(state: GameState): Record<TeamId, PendingAnswer> {
  const answerA = state.pendingAnswers.A;
  const answerB = state.pendingAnswers.B;
  if (!answerA || !answerB) throw new DomainError("島A・島Bの回答を両方入力してください。");
  return { A: answerA, B: answerB };
}

function applyStarterResult(state: GameState, data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  const selected = new Set<string>();
  for (const teamId of TEAM_IDS) {
    const answer = answers[teamId];
    if (answer.kind !== "starter") throw new DomainError("スターター回答が不正です。");
    const team = state.teams[teamId];
    team.starterProductId = answer.productId;
    selected.add(answer.productId);
    installNormalProduct(state, teamId, answer.productId, data, now, { requireOwned: false });
    state.lastResultMessages.push(`${team.islandName}：${productById(data, answer.productId).name}をスターターに選択`);
  }
  const sharedQueue = state.normalProductOrder.filter((productId) => !selected.has(productId));
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    team.yardQueue = [...sharedQueue];
    team.yardVisibleProductIds = team.yardQueue.slice(0, data.yard.visibleCount);
  }
  state.pendingAnswers = {};
}

function applyPracticeResult(state: GameState, data: GameData, now: string): void {
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    team.materials += data.initial.tutorialPracticeMaterials;
    addLog(state, team, now, "tutorial_explore", "練習探索", { materialsDelta: data.initial.tutorialPracticeMaterials });
    state.lastResultMessages.push(`${team.islandName}：練習探索で資材+${data.initial.tutorialPracticeMaterials}`);
  }
}

function applyTutorialBuildResult(state: GameState, data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  for (const teamId of TEAM_IDS) {
    const answer = answers[teamId];
    if (answer.kind !== "tutorialBuild") throw new DomainError("0日目整備回答が不正です。");
    const team = state.teams[teamId];
    team.tutorialBuildStat = answer.stat;
    applyStatDelta(team, { [answer.stat]: data.initial.tutorialBuildIncrement }, data);
    addLog(state, team, now, "tutorial_build", `${answer.stat}を無料整備`);
    state.lastResultMessages.push(`${team.islandName}：無料整備を実行`);
  }
  state.pendingAnswers = {};
}

function applyNormalAction(state: GameState, teamId: TeamId, answer: PendingAnswer, data: GameData, now: string): void {
  if (answer.kind !== "normalAction") throw new DomainError("通常行動の回答が不正です。");
  const team = state.teams[teamId];
  const action = answer.action;
  if (action.kind === "beach") {
    team.materials += data.actions.beachExplore.materialsDelta;
    addLog(state, team, now, "beach", "漂着海岸を探索", { materialsDelta: data.actions.beachExplore.materialsDelta });
  } else if (action.kind === "yard") {
    if (!team.yardVisibleProductIds.includes(action.productId)) throw new DomainError("現在のヤード候補ではありません。");
    team.yardQueue = team.yardQueue.filter((id) => id !== action.productId);
    team.yardVisibleProductIds = team.yardQueue.slice(0, data.yard.visibleCount);
    team.ownedNormalProductIds.push(action.productId);
    addLog(state, team, now, "yard", `${productById(data, action.productId).name}を取得`);
  } else if (action.kind === "grc") {
    acquireGrc(state, teamId, action.productId, data, now);
  } else if (action.kind === "build") {
    if (team.materials < data.actions.build.materialsCost || team.stats[action.stat] >= data.limits.statMax) {
      throw new DomainError("この能力は現在整備できません。");
    }
    team.materials -= data.actions.build.materialsCost;
    applyStatDelta(team, { [action.stat]: data.actions.build.statIncrement }, data);
    addLog(state, team, now, "build", `${action.stat}を整備`, { materialsDelta: -data.actions.build.materialsCost });
  } else if (action.kind === "install") {
    installNormalProduct(state, teamId, action.productId, data, now);
  } else {
    addLog(state, team, now, "wait", "待機");
  }
}

function applyNormalResult(state: GameState, data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  for (const teamId of TEAM_IDS) {
    applyNormalAction(state, teamId, answers[teamId], data, now);
    state.lastResultMessages.push(`${state.teams[teamId].islandName}：行動結果を反映`);
  }
  state.pendingAnswers = {};
}

function applyDay2Result(state: GameState, data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  for (const teamId of TEAM_IDS) {
    const answer = answers[teamId];
    if (answer.kind !== "day2") throw new DomainError("2日目イベント回答が不正です。");
    const team = state.teams[teamId];
    team.day2Choice = answer.choice;
    if (answer.choice === "parts") {
      team.materials += data.events.day2.parts.materialsDelta;
      addLog(state, team, now, "day2_parts", "ブイの部品を回収", { materialsDelta: data.events.day2.parts.materialsDelta });
    } else {
      team.materials += data.events.day2.sensor.materialsDelta;
      team.day3DamageReduction = data.events.day2.sensor.day3DamageReduction;
      team.day2RouteEliminated = state.routeToEliminate;
      addLog(state, team, now, "day2_sensor", "ブイのセンサーを復旧", { materialsDelta: data.events.day2.sensor.materialsDelta });
    }
    state.lastResultMessages.push(`${team.islandName}：${answer.choice === "parts" ? "部品回収" : "センサー復旧"}`);
  }
  state.pendingAnswers = {};
}

export function applyDay3Rain(state: GameState, data: GameData, now: string): void {
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    const base = team.stats.drainage >= 3
      ? data.events.day3.damageByDrainage["3+"]
      : team.stats.drainage === 2
        ? data.events.day3.damageByDrainage["2"]
        : data.events.day3.damageByDrainage["1"];
    const damage = Math.max(0, base - team.day3DamageReduction);
    applyDamage(state, team, damage, now, `3日目集中豪雨：${damage}ダメージ`);
    state.lastResultMessages.push(`${team.islandName}：集中豪雨 ${damage}ダメージ`);
  }
}

function applyDay4Result(state: GameState, data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  for (const teamId of TEAM_IDS) {
    const answer = answers[teamId];
    if (answer.kind !== "day4") throw new DomainError("4日目イベント回答が不正です。");
    const team = state.teams[teamId];
    team.day4Choice = answer.choice;
    if (answer.choice === "data") {
      team.earlyFinalRequirementsKnown = data.events.day4.data.revealFinalRequirements;
      addLog(state, team, now, "day4_data", "観測データを復旧");
    } else {
      team.materials += data.events.day4.cargo.materialsDelta;
      addLog(state, team, now, "day4_cargo", "ドローンの積荷を回収", { materialsDelta: data.events.day4.cargo.materialsDelta });
    }
    state.lastResultMessages.push(`${team.islandName}：${answer.choice === "data" ? "観測データ復旧" : "積荷回収"}`);
  }
  state.pendingAnswers = {};
}

export function applyDay5RouteFailure(state: GameState, data: GameData, now: string): void {
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    const rule = data.events.day5.routeFailure;
    const damage = team.stats.access < rule.damageIfAccessBelow ? rule.damage : 0;
    applyDamage(state, team, damage, now, `5日目ルート崩壊：${damage}ダメージ`);
    state.lastResultMessages.push(`${team.islandName}：ルート崩壊 ${damage}ダメージ`);
  }
}

function finalPhaseIdFromResultState(stateId: string): GameData["final"]["phases"][number]["id"] | null {
  const map: Record<string, GameData["final"]["phases"][number]["id"]> = {
    D7_RAIN_RESULT: "final_rain",
    D7_ROUTE_RESULT: "final_route",
    D7_WIND_RESULT: "final_wind",
    D7_BLACKOUT_RESULT: "final_blackout"
  };
  return map[stateId] ?? null;
}

export function applyFinalPhase(state: GameState, phaseId: GameData["final"]["phases"][number]["id"], data: GameData, now: string): void {
  const answers = requireBothAnswers(state);
  const phase = data.final.phases.find((candidate) => candidate.id === phaseId);
  if (!phase) throw new DomainError("最終台風の段階が不正です。");

  for (const teamId of TEAM_IDS) {
    const answer = answers[teamId];
    if (answer.kind !== "finalChoice") throw new DomainError("最終台風回答が不正です。");
    const team = state.teams[teamId];
    if (answer.emergencyProductId) {
      installNormalProduct(state, teamId, answer.emergencyProductId, data, now, { emergency: true });
      team.emergencyInstallUsed = true;
    }
    const shortage = Math.max(0, state.finalRequirements[phase.stat] - team.stats[phase.stat]);
    const baseDamage = damageFromShortage(shortage, data);
    const preparedReduction = team.preparedReductionPhaseIds.includes(phaseId)
      ? team.installedNormalProductIds.reduce((sum, productId) => {
          const product = productById(data, productId);
          return sum + (product.preparedReductionPhase === phaseId ? product.preparedReduction : 0);
        }, 0)
      : 0;
    const damage = Math.max(0, baseDamage - preparedReduction);
    applyDamage(state, team, damage, now, `${phase.name}：${damage}ダメージ`);
    state.lastResultMessages.push(`${team.islandName}：${phase.name} ${damage}ダメージ`);
  }
  state.pendingAnswers = {};
}

function applyResultForState(state: GameState, data: GameData, now: string): void {
  if (state.stateId === "D0_STARTER_RESULT") applyStarterResult(state, data, now);
  else if (state.stateId === "D0_PRACTICE_RESULT") applyPracticeResult(state, data, now);
  else if (state.stateId === "D0_TUTORIAL_BUILD_RESULT") applyTutorialBuildResult(state, data, now);
  else if (/^D[1-6]_(MORNING|AFTERNOON)_RESULT$/.test(state.stateId)) applyNormalResult(state, data, now);
  else if (state.stateId === "D2_BUOY_RESULT") applyDay2Result(state, data, now);
  else if (state.stateId === "D3_HEAVY_RAIN_RESULT") applyDay3Rain(state, data, now);
  else if (state.stateId === "D4_DRONE_RESULT") applyDay4Result(state, data, now);
  else if (state.stateId === "D5_ROUTE_FAILURE_RESULT") applyDay5RouteFailure(state, data, now);
  else {
    const phaseId = finalPhaseIdFromResultState(state.stateId);
    if (phaseId) applyFinalPhase(state, phaseId, data, now);
  }
}

function advanceState(state: GameState, data: GameData, now: string): void {
  if (state.status === "paused") throw new DomainError("一時停止中です。再開してから進めてください。");
  if (state.status === "finished") throw new DomainError("ゲームは終了しています。");
  const requiredAnswer = answerKindForState(state.stateId);
  if (requiredAnswer) requireBothAnswers(state);
  const next = nextStateId(state.stateId);
  if (!next) throw new DomainError("次の状態がありません。");

  state.stateId = next;
  state.day = stateDay(next);
  state.timeSlot = stateTimeSlot(next);
  if (next.endsWith("_RESULT")) state.lastResultMessages = [];

  if (next === "D1_OPEN") {
    state.status = "running";
    state.publicForecastStage = 1;
  }
  if (next === "D5_TYPHOON_REVEAL") state.publicForecastStage = 2;
  if (next === "D6_FULL_FORECAST") state.publicForecastStage = 3;
  if (/^D[1-6]_OPEN$/.test(next)) {
    for (const teamId of TEAM_IDS) {
      const team = state.teams[teamId];
      team.decisionCaptainIndex = (state.day - 1) % team.memberNames.length;
    }
  }

  applyResultForState(state, data, now);
  if (next === "D8_RESCUE") {
    state.status = "finished";
    state.timerRunning = false;
    state.timerStartedAt = null;
    state.lastResultMessages = ["救助信号を確認。8日目の結果が確定しました。"];
  }
}

function validateProductIds(data: GameData, ids: string[], category: "normal" | "grc"): string[] {
  const unique = [...new Set(ids)];
  for (const id of unique) {
    const product = productById(data, id);
    if (product.category !== category) throw new DomainError(`${id}は${category}製品ではありません。`);
  }
  return unique;
}

function applyManualPatch(state: GameState, teamId: TeamId, patch: ManualTeamPatch, data: GameData): void {
  const team = state.teams[teamId];
  if (patch.hpInternal !== undefined) team.hpInternal = Math.trunc(patch.hpInternal);
  if (patch.materials !== undefined) team.materials = Math.max(0, Math.trunc(patch.materials));
  if (patch.stats) {
    for (const stat of STAT_KEYS) team.stats[stat] = clamp(Math.trunc(patch.stats[stat]), 0, data.limits.statMax);
  }
  if (patch.ownedNormalProductIds) team.ownedNormalProductIds = validateProductIds(data, patch.ownedNormalProductIds, "normal");
  if (patch.installedNormalProductIds) team.installedNormalProductIds = validateProductIds(data, patch.installedNormalProductIds, "normal");
  if (patch.installedGrcProductIds) team.installedGrcProductIds = validateProductIds(data, patch.installedGrcProductIds, "grc");
  if (patch.grcAcquiredCount !== undefined) team.grcAcquiredCount = clamp(Math.trunc(patch.grcAcquiredCount), 0, data.grc.acquireMax);
  if (patch.emergencyInstallUsed !== undefined) team.emergencyInstallUsed = patch.emergencyInstallUsed;
}

export function applyHostCommand(state: GameState, command: HostCommand, data: GameData, now = new Date().toISOString()): GameState {
  const next = structuredClone(state);
  if (next.status === "finished" && command.type !== "MANUAL_CORRECTION") {
    throw new DomainError("終了済みゲームへこの操作はできません。");
  }
  if (next.status === "paused" && !["RESUME", "MANUAL_CORRECTION", "TIMER_STOP", "TIMER_RESET"].includes(command.type)) {
    throw new DomainError("一時停止中です。");
  }

  if (command.type === "SUBMIT_ANSWER") {
    validateAnswer(next, command.teamId, command.answer, data);
    next.pendingAnswers[command.teamId] = structuredClone(command.answer);
  } else if (command.type === "ADVANCE") {
    advanceState(next, data, now);
  } else if (command.type === "PAUSE") {
    next.status = "paused";
  } else if (command.type === "RESUME") {
    next.status = next.stateId === "D0_INTRO" ? "setup" : "running";
  } else if (command.type === "TIMER_START") {
    if (!next.timerRunning) {
      next.timerRunning = true;
      next.timerStartedAt = now;
    }
  } else if (command.type === "TIMER_STOP") {
    next.timerSeconds = getRemainingTimerSeconds(next, now);
    next.timerRunning = false;
    next.timerStartedAt = null;
  } else if (command.type === "TIMER_RESET") {
    next.timerSeconds = Math.max(0, Math.trunc(command.seconds));
    next.timerRunning = false;
    next.timerStartedAt = null;
  } else if (command.type === "TIMER_ADJUST") {
    next.timerSeconds = Math.max(0, getRemainingTimerSeconds(next, now) + Math.trunc(command.deltaSeconds));
    next.timerStartedAt = next.timerRunning ? now : null;
  } else if (command.type === "MANUAL_CORRECTION") {
    applyManualPatch(next, command.teamId, command.patch, data);
    if (command.stateId !== undefined) {
      if (!STATE_IDS.has(command.stateId)) throw new DomainError("不明な状態IDです。");
      next.stateId = command.stateId;
      next.day = stateDay(command.stateId);
      next.timeSlot = stateTimeSlot(command.stateId);
      next.pendingAnswers = {};
    }
    addLog(next, next.teams[command.teamId], now, "manual_correction", "ファシリが手動修正");
  }

  next.revision = state.revision + 1;
  next.updatedAt = now;
  return next;
}

export function getTeamOutcome(team: TeamState, data: GameData): TeamOutcome {
  const displayHp = Math.max(data.limits.hpDisplayMin, team.hpInternal);
  if (team.hpInternal <= 0) {
    const evacuation = data.survivalGrades.EVAC;
    return { displayHp, survived: false, grade: "EVAC", gradeLabel: evacuation?.label ?? "緊急避難" };
  }
  const grade = Object.entries(data.survivalGrades)
    .filter((entry): entry is [string, { minHp: number; maxHp?: number; label: string }] => entry[1].minHp !== undefined)
    .sort((left, right) => right[1].minHp - left[1].minHp)
    .find(([, rule]) => team.hpInternal >= rule.minHp);
  return {
    displayHp,
    survived: true,
    grade: grade?.[0] ?? "C",
    gradeLabel: grade?.[1].label ?? "奇跡の生還"
  };
}

export function getGameResult(state: GameState, data: GameData): GameResult {
  const outcomeA = getTeamOutcome(state.teams.A, data);
  const outcomeB = getTeamOutcome(state.teams.B, data);
  if (outcomeA.survived !== outcomeB.survived) {
    const winner = outcomeA.survived ? "A" : "B";
    return { winner, label: `${state.teams[winner].islandName}の勝利` };
  }
  if (state.teams.A.hpInternal === state.teams.B.hpInternal) {
    return { winner: "draw", label: "引き分け" };
  }
  const winner = state.teams.A.hpInternal > state.teams.B.hpInternal ? "A" : "B";
  return { winner, label: `${state.teams[winner].islandName}の勝利` };
}

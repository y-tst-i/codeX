import type { GameData } from "../src/shared/game-data-schema.js";
import type { GameState, PendingAnswer, TeamId } from "../src/shared/types.js";
import { TEAM_IDS } from "../src/shared/types.js";
import { createGame } from "../src/server/game-engine/create-game.js";
import { applyHostCommand } from "../src/server/game-engine/engine.js";
import { getLegalNormalActions } from "../src/server/game-engine/legal-actions.js";
import { answerKindForState } from "../src/server/game-engine/state-sequence.js";
import { loadGameData } from "../src/server/load-game-data.js";

export const gameData = loadGameData();

export function makeGame(seed = "test-seed", data: GameData = gameData): GameState {
  return createGame({
    gameId: "test-game",
    seed,
    now: "2026-08-27T00:00:00.000Z",
    teams: {
      A: { islandName: "あお島", memberNames: ["A1", "A2", "A3"] },
      B: { islandName: "みどり島", memberNames: ["B1", "B2", "B3"] }
    }
  }, data);
}

export function command(state: GameState, value: Parameters<typeof applyHostCommand>[1], data: GameData = gameData): GameState {
  return applyHostCommand(state, value, data, `2026-08-27T00:00:${String(state.revision).padStart(2, "0")}.000Z`);
}

export function defaultAnswer(state: GameState, teamId: TeamId, data: GameData = gameData): PendingAnswer {
  const kind = answerKindForState(state.stateId);
  if (kind === "starter") return { kind, productId: "kc_line_gutter" };
  if (kind === "tutorialBuild") return { kind, stat: "protection" };
  if (kind === "day2") return { kind, choice: "parts" };
  if (kind === "day4") return { kind, choice: "cargo" };
  if (kind === "normalAction") {
    const option = getLegalNormalActions(state, teamId, data)[0];
    if (!option) throw new Error("合法行動がありません。");
    return { kind, action: option.action };
  }
  if (kind === "finalChoice") return { kind, emergencyProductId: null };
  throw new Error(`${state.stateId}は回答状態ではありません。`);
}

export function submitBoth(
  state: GameState,
  answers?: Partial<Record<TeamId, PendingAnswer>>,
  data: GameData = gameData
): GameState {
  let next = state;
  for (const teamId of TEAM_IDS) {
    next = command(next, {
      type: "SUBMIT_ANSWER",
      teamId,
      answer: answers?.[teamId] ?? defaultAnswer(next, teamId, data)
    }, data);
  }
  return next;
}

export function advanceTo(state: GameState, targetStateId: string, data: GameData = gameData): GameState {
  let next = state;
  for (let step = 0; step < 300 && next.stateId !== targetStateId; step += 1) {
    if (answerKindForState(next.stateId) && (!next.pendingAnswers.A || !next.pendingAnswers.B)) {
      next = submitBoth(next, undefined, data);
    }
    next = command(next, { type: "ADVANCE" }, data);
  }
  if (next.stateId !== targetStateId) throw new Error(`${targetStateId}まで進めませんでした。現在: ${next.stateId}`);
  return next;
}

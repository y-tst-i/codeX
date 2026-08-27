import type { GameData } from "../../shared/game-data-schema.js";
import type { GameState, PendingAnswer, TeamId, TeamState } from "../../shared/types.js";
import { TEAM_IDS } from "../../shared/types.js";
import { getGameResult, getRemainingTimerSeconds, getTeamOutcome } from "./engine.js";
import { getLegalNormalActions, getVisibleGrcProductIds } from "./legal-actions.js";
import { answerKindForState } from "./state-sequence.js";

function publicTeam(team: TeamState, data: GameData) {
  return {
    id: team.id,
    islandName: team.islandName,
    hp: Math.max(data.limits.hpDisplayMin, team.hpInternal),
    stats: team.stats,
    materials: team.materials,
    installedNormalProductIds: team.installedNormalProductIds,
    installedGrcProductIds: team.installedGrcProductIds
  };
}

function revealedAnswers(state: GameState): Partial<Record<TeamId, PendingAnswer>> | undefined {
  return state.stateId.includes("_REVEAL") ? structuredClone(state.pendingAnswers) : undefined;
}

export function toHostView(state: GameState, data: GameData, now = new Date().toISOString()) {
  return {
    state: structuredClone(state),
    answerKind: answerKindForState(state.stateId),
    legalActions: Object.fromEntries(
      TEAM_IDS.map((teamId) => [teamId, getLegalNormalActions(state, teamId, data)])
    ),
    visibleGrcProductIds: Object.fromEntries(
      TEAM_IDS.map((teamId) => [teamId, getVisibleGrcProductIds(state, teamId, data)])
    ),
    products: data.products,
    typhoon: data.typhoons[state.typhoonType],
    timerRemainingSeconds: getRemainingTimerSeconds(state, now),
    outcomes: Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, getTeamOutcome(state.teams[teamId], data)])),
    gameResult: state.status === "finished" ? getGameResult(state, data) : undefined
  };
}

export function toScreenView(state: GameState, data: GameData) {
  const showTyphoon = state.publicForecastStage >= 2;
  const showRequirements = state.publicForecastStage >= 3;
  return {
    gameId: state.gameId,
    revision: state.revision,
    status: state.status,
    stateId: state.stateId,
    day: state.day,
    timeSlot: state.timeSlot,
    publicForecastStage: state.publicForecastStage,
    typhoon: showTyphoon
      ? {
          type: state.typhoonType,
          name: data.typhoons[state.typhoonType].name,
          requirements: showRequirements ? state.finalRequirements : undefined
        }
      : undefined,
    teams: Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, publicTeam(state.teams[teamId], data)])),
    revealedAnswers: revealedAnswers(state),
    lastResultMessages: state.lastResultMessages,
    outcomes: state.status === "finished"
      ? Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, getTeamOutcome(state.teams[teamId], data)]))
      : undefined,
    gameResult: state.status === "finished" ? getGameResult(state, data) : undefined
  };
}

export function toTeamView(state: GameState, teamId: TeamId, data: GameData) {
  const own = state.teams[teamId];
  const opponentId: TeamId = teamId === "A" ? "B" : "A";
  const requirementsKnown = state.publicForecastStage >= 3 || own.earlyFinalRequirementsKnown;
  return {
    gameId: state.gameId,
    revision: state.revision,
    status: state.status,
    stateId: state.stateId,
    day: state.day,
    timeSlot: state.timeSlot,
    answerKind: answerKindForState(state.stateId),
    ownTeam: structuredClone(own),
    opponent: publicTeam(state.teams[opponentId], data),
    ownPendingAnswer: state.pendingAnswers[teamId] ? structuredClone(state.pendingAnswers[teamId]) : undefined,
    legalActions: getLegalNormalActions(state, teamId, data),
    visibleGrcProductIds: getVisibleGrcProductIds(state, teamId, data),
    privateForecast: {
      eliminatedRoute: own.day2RouteEliminated,
      day3DetailedConditionKnown: own.day2Choice === "sensor",
      finalRequirements: requirementsKnown ? state.finalRequirements : undefined
    },
    publicTyphoon: state.publicForecastStage >= 2
      ? { type: state.typhoonType, name: data.typhoons[state.typhoonType].name }
      : undefined,
    revealedAnswers: revealedAnswers(state),
    lastResultMessages: state.lastResultMessages
  };
}

export type HostView = ReturnType<typeof toHostView>;
export type ScreenView = ReturnType<typeof toScreenView>;
export type TeamView = ReturnType<typeof toTeamView>;

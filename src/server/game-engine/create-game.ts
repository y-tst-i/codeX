import type { GameData } from "../../shared/game-data-schema.js";
import type { CreateGameInput, GameState, TeamId, TeamState } from "../../shared/types.js";
import { TEAM_IDS } from "../../shared/types.js";
import { deterministicShuffle } from "./random.js";

function createTeam(id: TeamId, input: CreateGameInput, data: GameData, grcOrder: string[]): TeamState {
  const setup = input.teams[id];
  const { minPlayersPerTeam, maxPlayersPerTeam } = data.sessionRules;
  if (setup.memberNames.length < minPlayersPerTeam || setup.memberNames.length > maxPlayersPerTeam) {
    throw new Error(`島${id}の参加者は${minPlayersPerTeam}〜${maxPlayersPerTeam}名で登録してください。`);
  }
  if (!setup.islandName.trim()) throw new Error(`島${id}の名前を入力してください。`);
  if (setup.memberNames.some((name) => !name.trim())) throw new Error(`島${id}の表示名に空欄があります。`);

  return {
    id,
    islandName: setup.islandName.trim(),
    memberNames: setup.memberNames.map((name) => name.trim()),
    hpInternal: data.initial.hp,
    stats: { ...data.initial.stats },
    materials: data.initial.materials,
    ownedNormalProductIds: [],
    installedNormalProductIds: [],
    installedGrcProductIds: [],
    preparedReductionPhaseIds: [],
    grcAcquiredCount: 0,
    emergencyInstallUsed: false,
    starterProductId: null,
    tutorialBuildStat: null,
    day2Choice: null,
    day2RouteEliminated: null,
    day3DamageReduction: 0,
    day4Choice: null,
    earlyFinalRequirementsKnown: false,
    yardQueue: [],
    yardVisibleProductIds: [],
    grcQueue: [...grcOrder],
    decisionCaptainIndex: 0,
    actionHistory: [],
    maxDamageTaken: 0
  };
}

export function createGame(input: CreateGameInput, data: GameData): GameState {
  const normalProductIds = data.products.filter((product) => product.category === "normal").map((product) => product.id);
  const grcProductIds = data.products.filter((product) => product.category === "grc").map((product) => product.id);
  const normalProductOrder = deterministicShuffle(normalProductIds, input.seed, "normal-products");
  const grcProductOrder = deterministicShuffle(grcProductIds, input.seed, "grc-products");
  const typhoonOrder = deterministicShuffle(Object.keys(data.typhoons), input.seed, "typhoon") as GameState["typhoonType"][];
  const routeOrder = deterministicShuffle(["A", "B", "C"], input.seed, "route");
  const typhoonType = typhoonOrder[0];
  const routeToEliminate = routeOrder[0];
  if (!typhoonType || !routeToEliminate) throw new Error("seedから初期条件を生成できませんでした。");
  const now = input.now ?? new Date().toISOString();

  const teams = Object.fromEntries(
    TEAM_IDS.map((teamId) => [teamId, createTeam(teamId, input, data, grcProductOrder)])
  ) as Record<TeamId, TeamState>;

  return {
    gameId: input.gameId,
    seed: input.seed,
    revision: 0,
    status: "setup",
    day: 0,
    timeSlot: "tutorial",
    stateId: "D0_INTRO",
    typhoonType,
    finalRequirements: { ...data.typhoons[typhoonType].requirements },
    routeToEliminate,
    publicForecastStage: 0,
    normalProductOrder,
    grcProductOrder,
    teams,
    pendingAnswers: {},
    timerSeconds: 120,
    timerRunning: false,
    timerStartedAt: null,
    lastResultMessages: ["ゲームを作成しました。0日目を開始してください。"],
    createdAt: now,
    updatedAt: now
  };
}

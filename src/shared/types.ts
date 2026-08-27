export const TEAM_IDS = ["A", "B"] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const STAT_KEYS = ["protection", "drainage", "access", "lifeline"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export interface Stats {
  protection: number;
  drainage: number;
  access: number;
  lifeline: number;
}

export type GameStatus = "setup" | "running" | "paused" | "finished";
export type TimeSlot = "tutorial" | "morning" | "afternoon" | "event" | "final" | "ending";

export interface ActionLog {
  id: string;
  at: string;
  day: number;
  stateId: string;
  type: string;
  description: string;
  hpDelta?: number;
  materialsDelta?: number;
}

export interface TeamState {
  id: TeamId;
  islandName: string;
  memberNames: string[];
  hpInternal: number;
  stats: Stats;
  materials: number;
  ownedNormalProductIds: string[];
  installedNormalProductIds: string[];
  installedGrcProductIds: string[];
  preparedReductionPhaseIds: string[];
  grcAcquiredCount: number;
  emergencyInstallUsed: boolean;
  starterProductId: string | null;
  tutorialBuildStat: StatKey | null;
  day2Choice: "parts" | "sensor" | null;
  day2RouteEliminated: string | null;
  day3DamageReduction: number;
  day4Choice: "data" | "cargo" | null;
  earlyFinalRequirementsKnown: boolean;
  yardQueue: string[];
  yardVisibleProductIds: string[];
  grcQueue: string[];
  decisionCaptainIndex: number;
  actionHistory: ActionLog[];
  maxDamageTaken: number;
}

export type NormalActionAnswer =
  | { kind: "beach" }
  | { kind: "yard"; productId: string }
  | { kind: "grc"; productId: string }
  | { kind: "build"; stat: StatKey }
  | { kind: "install"; productId: string }
  | { kind: "wait" };

export type PendingAnswer =
  | { kind: "starter"; productId: string }
  | { kind: "tutorialBuild"; stat: StatKey }
  | { kind: "day2"; choice: "parts" | "sensor" }
  | { kind: "day4"; choice: "data" | "cargo" }
  | { kind: "normalAction"; action: NormalActionAnswer }
  | { kind: "finalChoice"; emergencyProductId: string | null };

export interface GameState {
  gameId: string;
  seed: string;
  revision: number;
  status: GameStatus;
  day: number;
  timeSlot: TimeSlot;
  stateId: string;
  typhoonType: "heavy_rain" | "coastal" | "mountain";
  finalRequirements: Stats;
  routeToEliminate: string;
  publicForecastStage: number;
  normalProductOrder: string[];
  grcProductOrder: string[];
  teams: Record<TeamId, TeamState>;
  pendingAnswers: Partial<Record<TeamId, PendingAnswer>>;
  timerSeconds: number;
  timerRunning: boolean;
  timerStartedAt: string | null;
  lastResultMessages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamSetup {
  islandName: string;
  memberNames: string[];
}

export interface CreateGameInput {
  gameId: string;
  seed: string;
  teams: Record<TeamId, TeamSetup>;
  now?: string;
}

export type ManualTeamPatch = Partial<
  Pick<
    TeamState,
    | "hpInternal"
    | "stats"
    | "materials"
    | "ownedNormalProductIds"
    | "installedNormalProductIds"
    | "installedGrcProductIds"
    | "grcAcquiredCount"
    | "emergencyInstallUsed"
  >
>;

export type HostCommand =
  | { type: "SUBMIT_ANSWER"; teamId: TeamId; answer: PendingAnswer }
  | { type: "ADVANCE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TIMER_START" }
  | { type: "TIMER_STOP" }
  | { type: "TIMER_RESET"; seconds: number }
  | { type: "TIMER_ADJUST"; deltaSeconds: number }
  | { type: "MANUAL_CORRECTION"; teamId: TeamId; patch: ManualTeamPatch; stateId?: string };

export interface HostCommandEnvelope {
  commandId: string;
  revision: number;
  command: HostCommand | { type: "UNDO" };
}

export interface LegalActionOption {
  id: string;
  label: string;
  action: NormalActionAnswer;
}

export interface TeamOutcome {
  displayHp: number;
  survived: boolean;
  grade: string;
  gradeLabel: string;
}

export interface GameResult {
  winner: TeamId | "draw";
  label: string;
}

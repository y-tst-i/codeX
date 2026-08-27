import type { TimeSlot } from "../../shared/types.js";

function normalDayStates(day: number): string[] {
  const states = [`D${day}_OPEN`];
  if (day === 2) states.push("D2_BUOY_CHOICE", "D2_BUOY_RESULT");
  if (day === 4) states.push("D4_DRONE_CHOICE", "D4_DRONE_RESULT");
  if (day === 6) states.push("D6_FULL_FORECAST");
  states.push(
    `D${day}_MORNING_COUNCIL`,
    `D${day}_MORNING_INPUT`,
    `D${day}_MORNING_LOCKED`,
    `D${day}_MORNING_REVEAL`,
    `D${day}_MORNING_RESULT`
  );
  if (day === 5) states.push("D5_TYPHOON_REVEAL");
  if (day === 6) states.push("D6_EXPLORATION_CLOSED");
  states.push(
    `D${day}_AFTERNOON_COUNCIL`,
    `D${day}_AFTERNOON_INPUT`,
    `D${day}_AFTERNOON_LOCKED`,
    `D${day}_AFTERNOON_REVEAL`,
    `D${day}_AFTERNOON_RESULT`
  );
  if (day === 3) states.push("D3_HEAVY_RAIN", "D3_HEAVY_RAIN_RESULT");
  if (day === 5) states.push("D5_ROUTE_FAILURE", "D5_ROUTE_FAILURE_RESULT");
  states.push(`D${day}_SUMMARY`);
  return states;
}

export const STATE_SEQUENCE = [
  "D0_INTRO",
  "D0_ISLAND_NAME",
  "D0_STARTER_SELECT",
  "D0_STARTER_RESULT",
  "D0_PRACTICE_EXPLORE",
  "D0_PRACTICE_RESULT",
  "D0_TUTORIAL_BUILD",
  "D0_TUTORIAL_BUILD_RESULT",
  "D0_STORM_WARNING",
  ...normalDayStates(1),
  ...normalDayStates(2),
  ...normalDayStates(3),
  ...normalDayStates(4),
  ...normalDayStates(5),
  ...normalDayStates(6),
  "D7_RETURN_TO_MAIN",
  "D7_BRIEFING",
  "D7_FINAL_COUNCIL",
  "D7_RAIN_INPUT",
  "D7_RAIN_RESULT",
  "D7_ROUTE_INPUT",
  "D7_ROUTE_RESULT",
  "D7_EYE_OF_STORM",
  "D7_WIND_INPUT",
  "D7_WIND_RESULT",
  "D7_BLACKOUT_INPUT",
  "D7_BLACKOUT_RESULT",
  "D7_COMPLETE",
  "D8_RESCUE"
] as const;

export const STATE_IDS = new Set<string>(STATE_SEQUENCE);

export function nextStateId(current: string): string | null {
  const index = STATE_SEQUENCE.indexOf(current as (typeof STATE_SEQUENCE)[number]);
  return index < 0 || index >= STATE_SEQUENCE.length - 1 ? null : STATE_SEQUENCE[index + 1] ?? null;
}

export function stateDay(stateId: string): number {
  const match = /^D(\d+)_/.exec(stateId);
  return match?.[1] ? Number(match[1]) : 0;
}

export function stateTimeSlot(stateId: string): TimeSlot {
  if (stateId.startsWith("D0_")) return "tutorial";
  if (stateId.startsWith("D7_")) return "final";
  if (stateId.startsWith("D8_")) return "ending";
  if (stateId.includes("MORNING")) return "morning";
  if (stateId.includes("AFTERNOON")) return "afternoon";
  return "event";
}

export type AnswerKind = "starter" | "tutorialBuild" | "day2" | "day4" | "normalAction" | "finalChoice";

export function answerKindForState(stateId: string): AnswerKind | null {
  if (stateId === "D0_STARTER_SELECT") return "starter";
  if (stateId === "D0_TUTORIAL_BUILD") return "tutorialBuild";
  if (stateId === "D2_BUOY_CHOICE") return "day2";
  if (stateId === "D4_DRONE_CHOICE") return "day4";
  if (/^D[1-6]_(MORNING|AFTERNOON)_INPUT$/.test(stateId)) return "normalAction";
  if (/^D7_(RAIN|ROUTE|WIND|BLACKOUT)_INPUT$/.test(stateId)) return "finalChoice";
  return null;
}

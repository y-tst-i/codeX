import { describe, expect, it } from "vitest";
import { toHostView, toScreenView, toTeamView } from "../src/server/game-engine/views.js";
import { advanceTo, gameData, makeGame, submitBoth } from "./helpers.js";

describe("情報境界", () => {
  it("Aだけのセンサー情報をBと共有画面へ含めない", () => {
    let state = advanceTo(makeGame(), "D2_BUOY_CHOICE");
    state = submitBoth(state, {
      A: { kind: "day2", choice: "sensor" },
      B: { kind: "day2", choice: "parts" }
    });
    state = advanceTo(state, "D2_BUOY_RESULT");
    const host = toHostView(state, gameData);
    const teamA = toTeamView(state, "A", gameData);
    const teamB = toTeamView(state, "B", gameData);
    const screen = toScreenView(state, gameData);
    expect(host.state.teams.A.day2RouteEliminated).toMatch(/^[ABC]$/);
    expect(teamA.privateForecast.eliminatedRoute).toMatch(/^[ABC]$/);
    expect(teamB.privateForecast.eliminatedRoute).toBeNull();
    expect(JSON.stringify(screen)).not.toContain("routeToEliminate");
    expect(JSON.stringify(screen)).not.toContain("day2RouteEliminated");
  });

  it("Aだけの4日目必要LvをBと共有画面へ含めない", () => {
    let state = advanceTo(makeGame(), "D4_DRONE_CHOICE");
    state = submitBoth(state, {
      A: { kind: "day4", choice: "data" },
      B: { kind: "day4", choice: "cargo" }
    });
    state = advanceTo(state, "D4_DRONE_RESULT");
    expect(toTeamView(state, "A", gameData).privateForecast.finalRequirements).toEqual(state.finalRequirements);
    expect(toTeamView(state, "B", gameData).privateForecast.finalRequirements).toBeUndefined();
    expect(JSON.stringify(toScreenView(state, gameData))).not.toContain("requirements");
  });

  it("未確定回答を相手・共有viewへ含めない", () => {
    const state = advanceTo(makeGame(), "D1_MORNING_INPUT");
    const answered = submitBoth(state, {
      A: { kind: "normalAction", action: { kind: "beach" } },
      B: { kind: "normalAction", action: { kind: "beach" } }
    });
    const teamA = toTeamView(answered, "A", gameData);
    const teamB = toTeamView(answered, "B", gameData);
    expect(teamA.ownPendingAnswer).toEqual(answered.pendingAnswers.A);
    expect(teamB.ownPendingAnswer).toEqual(answered.pendingAnswers.B);
    expect(JSON.stringify(teamA)).not.toContain('"pendingAnswers"');
    expect(JSON.stringify(toScreenView(answered, gameData))).not.toContain("pendingAnswers");
  });
});

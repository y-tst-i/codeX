import { describe, expect, it } from "vitest";
import type { PendingAnswer } from "../src/shared/types.js";
import { createGame } from "../src/server/game-engine/create-game.js";
import {
  applyDay3Rain,
  applyDay5RouteFailure,
  applyFinalPhase,
  applyHostCommand,
  damageFromShortage,
  getGameResult,
  installNormalProduct
} from "../src/server/game-engine/engine.js";
import { getLegalNormalActions } from "../src/server/game-engine/legal-actions.js";
import { advanceTo, command, gameData, makeGame, submitBoth } from "./helpers.js";

describe("ゲーム生成と基本ルール", () => {
  it("同じseedなら台風・製品順・GRC順が同じ", () => {
    const first = makeGame("same-seed");
    const second = makeGame("same-seed");
    expect(first.typhoonType).toBe(second.typhoonType);
    expect(first.normalProductOrder).toEqual(second.normalProductOrder);
    expect(first.grcProductOrder).toEqual(second.grcProductOrder);
    expect(first.routeToEliminate).toBe(second.routeToEliminate);
  });

  it("チーム人数が仕様外なら作成しない", () => {
    expect(() => createGame({
      gameId: "invalid",
      seed: "seed",
      teams: {
        A: { islandName: "A", memberNames: ["1", "2"] },
        B: { islandName: "B", memberNames: ["1", "2", "3"] }
      }
    }, gameData)).toThrow(/3〜4名/);
  });

  it("不足Lvのダメージ表をGAME_DATAから適用する", () => {
    expect([0, 1, 2, 3, 4, 5, 8].map((value) => damageFromShortage(value, gameData))).toEqual([0, 8, 20, 36, 56, 80, 80]);
  });

  it("能力上限7とHP上限100を守る", () => {
    const state = makeGame();
    state.day = 6;
    state.teams.A.stats.protection = 7;
    state.teams.A.hpInternal = 95;
    state.teams.A.ownedNormalProductIds = ["kp_block"];
    installNormalProduct(state, "A", "kp_block", gameData, "2026-08-27T00:00:00Z");
    expect(state.teams.A.stats.protection).toBe(7);
    expect(state.teams.A.hpInternal).toBe(100);
  });
});

describe("HANDOFF受入テスト", () => {
  it("受入1：0日目のKCスターター＋防護整備", () => {
    let state = advanceTo(makeGame(), "D0_STARTER_SELECT");
    state = submitBoth(state, {
      A: { kind: "starter", productId: "kc_line_gutter" },
      B: { kind: "starter", productId: "box_culvert" }
    });
    state = command(state, { type: "ADVANCE" });
    state = advanceTo(state, "D0_TUTORIAL_BUILD");
    state = submitBoth(state, {
      A: { kind: "tutorialBuild", stat: "protection" },
      B: { kind: "tutorialBuild", stat: "lifeline" }
    });
    state = command(state, { type: "ADVANCE" });
    state = advanceTo(state, "D1_OPEN");
    expect(state.teams.A).toMatchObject({
      hpInternal: 100,
      materials: 6,
      stats: { protection: 2, drainage: 3, access: 1, lifeline: 1 }
    });
    expect(Object.values(state.teams.A.stats).reduce((sum, value) => sum + value, 0)).toBe(7);
  });

  it("受入2：2日目センサーは情報と軽減を自チームへ付与", () => {
    let state = advanceTo(makeGame(), "D2_BUOY_CHOICE");
    state = submitBoth(state, {
      A: { kind: "day2", choice: "sensor" },
      B: { kind: "day2", choice: "parts" }
    });
    const before = state.teams.A.materials;
    state = command(state, { type: "ADVANCE" });
    expect(state.teams.A.materials).toBe(before + 1);
    expect(state.teams.A.day3DamageReduction).toBe(4);
    expect(state.teams.A.day2RouteEliminated).toMatch(/^[ABC]$/);
    expect(state.teams.B.day2RouteEliminated).toBeNull();
  });

  it("受入3：2日目GRCは1行動で取得・即設置", () => {
    let state = advanceTo(makeGame(), "D2_MORNING_INPUT");
    const productId = state.teams.A.grcQueue[0];
    expect(productId).toBeTruthy();
    const product = gameData.products.find((item) => item.id === productId);
    const stat = Object.keys(product?.statDelta ?? {})[0] as keyof typeof state.teams.A.stats;
    const before = state.teams.A.stats[stat];
    state = submitBoth(state, {
      A: { kind: "normalAction", action: { kind: "grc", productId: productId! } },
      B: { kind: "normalAction", action: { kind: "beach" } }
    });
    state = advanceTo(state, "D2_MORNING_RESULT");
    expect(state.teams.A.installedGrcProductIds).toContain(productId);
    expect(state.teams.A.grcAcquiredCount).toBe(1);
    expect(state.teams.A.stats[stat]).toBe(before + 1);
  });

  it("受入4：SW事前設置は不足Lv2の20から8軽減して12", () => {
    const state = makeGame();
    state.day = 6;
    state.stateId = "D6_AFTERNOON_RESULT";
    state.teams.A.stats.drainage = state.finalRequirements.drainage - 3;
    state.teams.A.ownedNormalProductIds = ["sw_variable_gutter"];
    installNormalProduct(state, "A", "sw_variable_gutter", gameData, "2026-08-27T00:00:00Z");
    state.teams.B.stats.drainage = state.finalRequirements.drainage;
    state.day = 7;
    state.stateId = "D7_RAIN_RESULT";
    state.pendingAnswers = {
      A: { kind: "finalChoice", emergencyProductId: null },
      B: { kind: "finalChoice", emergencyProductId: null }
    };
    const before = state.teams.A.hpInternal;
    applyFinalPhase(state, "final_rain", gameData, "2026-08-27T00:00:01Z");
    expect(before - state.teams.A.hpInternal).toBe(12);
  });

  it("受入5：SW緊急設置は排水+1のみで事前軽減なし", () => {
    const state = makeGame();
    state.day = 7;
    state.stateId = "D7_RAIN_RESULT";
    state.teams.A.stats.drainage = state.finalRequirements.drainage - 2;
    state.teams.A.ownedNormalProductIds = ["sw_variable_gutter"];
    state.teams.B.stats.drainage = state.finalRequirements.drainage;
    state.pendingAnswers = {
      A: { kind: "finalChoice", emergencyProductId: "sw_variable_gutter" },
      B: { kind: "finalChoice", emergencyProductId: null }
    };
    const before = state.teams.A.hpInternal;
    applyFinalPhase(state, "final_rain", gameData, "2026-08-27T00:00:00Z");
    expect(state.teams.A.stats.drainage).toBe(state.finalRequirements.drainage - 1);
    expect(state.teams.A.preparedReductionPhaseIds).not.toContain("final_rain");
    expect(before - state.teams.A.hpInternal).toBe(8);
  });

  it("受入6：KP緊急設置は判定前にHPを10回復", () => {
    const state = makeGame();
    state.day = 7;
    state.stateId = "D7_WIND_RESULT";
    state.teams.A.hpInternal = 40;
    state.teams.A.stats.protection = state.finalRequirements.protection;
    state.teams.A.ownedNormalProductIds = ["kp_block"];
    state.teams.B.stats.protection = state.finalRequirements.protection;
    state.pendingAnswers = {
      A: { kind: "finalChoice", emergencyProductId: "kp_block" },
      B: { kind: "finalChoice", emergencyProductId: null }
    };
    applyFinalPhase(state, "final_wind", gameData, "2026-08-27T00:00:00Z");
    expect(state.teams.A.hpInternal).toBe(50);
  });

  it("受入7：6日目午後に行動不能なら待機だけ", () => {
    const state = makeGame();
    state.day = 6;
    state.timeSlot = "afternoon";
    state.stateId = "D6_AFTERNOON_INPUT";
    state.teams.A.materials = 1;
    state.teams.A.ownedNormalProductIds = [];
    state.teams.A.yardVisibleProductIds = [];
    state.teams.A.grcQueue = [];
    expect(getLegalNormalActions(state, "A", gameData).map((option) => option.action)).toEqual([{ kind: "wait" }]);
  });
});

describe("日別被害と進行", () => {
  it("生還側を優先し、同条件では内部HPで勝敗を決める", () => {
    const state = makeGame();
    state.teams.A.hpInternal = 1;
    state.teams.B.hpInternal = 0;
    expect(getGameResult(state, gameData).winner).toBe("A");
    state.teams.A.hpInternal = -2;
    state.teams.B.hpInternal = -5;
    expect(getGameResult(state, gameData).winner).toBe("A");
    state.teams.B.hpInternal = -2;
    expect(getGameResult(state, gameData).winner).toBe("draw");
  });

  it("3日目の排水Lv1被害8をセンサーで4軽減", () => {
    const state = makeGame();
    state.day = 3;
    state.stateId = "D3_HEAVY_RAIN_RESULT";
    state.teams.A.stats.drainage = 1;
    state.teams.A.day3DamageReduction = 4;
    const before = state.teams.A.hpInternal;
    applyDay3Rain(state, gameData, "2026-08-27T00:00:00Z");
    expect(before - state.teams.A.hpInternal).toBe(4);
  });

  it("5日目アクセスLv2は10ダメージ、Lv3は0", () => {
    const state = makeGame();
    state.day = 5;
    state.stateId = "D5_ROUTE_FAILURE_RESULT";
    state.teams.A.stats.access = 2;
    state.teams.B.stats.access = 3;
    applyDay5RouteFailure(state, gameData, "2026-08-27T00:00:00Z");
    expect(state.teams.A.hpInternal).toBe(90);
    expect(state.teams.B.hpInternal).toBe(100);
  });

  it("決定担当は日ごとに交代する", () => {
    let state = advanceTo(makeGame(), "D1_OPEN");
    expect(state.teams.A.decisionCaptainIndex).toBe(0);
    state = advanceTo(state, "D2_OPEN");
    expect(state.teams.A.decisionCaptainIndex).toBe(1);
    state = advanceTo(state, "D3_OPEN");
    expect(state.teams.A.decisionCaptainIndex).toBe(2);
  });

  it("0日目から8日目までHost操作だけで完走する", () => {
    const state = advanceTo(makeGame("walkthrough"), "D8_RESCUE");
    expect(state.status).toBe("finished");
    expect(state.day).toBe(8);
    expect(state.teams.A.actionHistory.length).toBeGreaterThan(10);
    expect(state.teams.B.actionHistory.length).toBeGreaterThan(10);
  });

  it("古い回答種別を拒否する", () => {
    const state = advanceTo(makeGame(), "D0_STARTER_SELECT");
    const invalid = { kind: "day2", choice: "parts" } satisfies PendingAnswer;
    expect(() => applyHostCommand(state, { type: "SUBMIT_ANSWER", teamId: "A", answer: invalid }, gameData)).toThrow(/必要な回答/);
  });
});

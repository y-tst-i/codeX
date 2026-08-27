import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGameData } from "../src/shared/game-data-schema.js";
import { gameData } from "./helpers.js";

describe("GAME_DATA Schema", () => {
  it("正本JSONをv0.30.1として読み込む", () => {
    expect(gameData.version).toBe("0.30.1");
    expect(gameData.designVersion).toBe("0.30");
    expect(gameData.products).toHaveLength(9);
    expect(gameData.final.phases).toHaveLength(4);
  });

  it("不正な能力上限をfail fastする", () => {
    const value = JSON.parse(readFileSync(resolve("ISLAND7_GAME_DATA.json"), "utf8")) as Record<string, unknown>;
    const limits = value.limits as Record<string, unknown>;
    limits.statMax = -1;
    expect(() => parseGameData(value)).toThrow();
  });
});

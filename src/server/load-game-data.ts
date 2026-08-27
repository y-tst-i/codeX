import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseGameData, type GameData } from "../shared/game-data-schema.js";

export function loadGameData(path = resolve(process.cwd(), "ISLAND7_GAME_DATA.json")): GameData {
  const source = readFileSync(path, "utf8");
  return parseGameData(JSON.parse(source) as unknown);
}

import type { GameData } from "../../shared/game-data-schema.js";
import type { GameState, LegalActionOption, NormalActionAnswer, StatKey, TeamId } from "../../shared/types.js";
import { STAT_KEYS } from "../../shared/types.js";

const STAT_LABELS: Record<StatKey, string> = {
  protection: "防護",
  drainage: "排水",
  access: "アクセス",
  lifeline: "ライフライン"
};

function productName(productId: string, data: GameData): string {
  return data.products.find((product) => product.id === productId)?.name ?? productId;
}

export function getVisibleGrcProductIds(state: GameState, teamId: TeamId, data: GameData): string[] {
  return state.teams[teamId].grcQueue.slice(0, data.grc.visibleCount);
}

export function getLegalNormalActions(state: GameState, teamId: TeamId, data: GameData): LegalActionOption[] {
  const team = state.teams[teamId];
  const options: LegalActionOption[] = [];
  const explorationAllowed = !(
    state.day === 6 && state.timeSlot === "afternoon" && !data.events.day6.explorationAllowedAfternoon
  );

  if (explorationAllowed) {
    options.push({ id: "beach", label: `漂着海岸を探索（資材+${data.actions.beachExplore.materialsDelta}）`, action: { kind: "beach" } });
    for (const productId of team.yardVisibleProductIds) {
      options.push({
        id: `yard:${productId}`,
        label: `旧資材ヤード：${productName(productId, data)}を取得`,
        action: { kind: "yard", productId }
      });
    }
    if (data.grc.availableDays.includes(state.day) && team.grcAcquiredCount < data.grc.acquireMax) {
      for (const productId of getVisibleGrcProductIds(state, teamId, data)) {
        options.push({
          id: `grc:${productId}`,
          label: `高台施設跡：${productName(productId, data)}を取得・即設置`,
          action: { kind: "grc", productId }
        });
      }
    }
  }

  if (team.materials >= data.actions.build.materialsCost) {
    for (const stat of STAT_KEYS) {
      if (team.stats[stat] < data.limits.statMax) {
        options.push({
          id: `build:${stat}`,
          label: `整備：${STAT_LABELS[stat]}+${data.actions.build.statIncrement}（資材-${data.actions.build.materialsCost}）`,
          action: { kind: "build", stat }
        });
      }
    }
  }

  for (const productId of team.ownedNormalProductIds) {
    options.push({
      id: `install:${productId}`,
      label: `設置：${productName(productId, data)}`,
      action: { kind: "install", productId }
    });
  }

  if (options.length === 0) {
    options.push({ id: "wait", label: "待機", action: { kind: "wait" } });
  }
  return options;
}

export function actionsEqual(left: NormalActionAnswer, right: NormalActionAnswer): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

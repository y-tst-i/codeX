import { describe, expect, it } from "vitest";
import { MGK_SCRIPT } from "../src/lib/mgKit";
import { buildMotionPrompt } from "../src/lib/prompts";

type Kit = {
  keys(t: number, frames: Record<string, unknown>[]): Record<string, number>;
  punch(t: number, times: number[], dur: number): number;
  hop(t: number, start: number, dur: number, h: number): { y: number; sx: number; sy: number };
  anim(t: number, start: number, dur: number, ease: string): number;
  envelope(t: number, start: number, a: number, h: number, r: number): number;
  shake(t: number, start: number, dur: number, amp: number, seed: number): { x: number; y: number; r: number };
};

function loadKit(): Kit {
  const win: { MGK?: Kit } = {};
  new Function("window", MGK_SCRIPT)(win);
  return win.MGK!;
}

describe("演出の道具箱 MGK", () => {
  it("キーフレームは、省略した値を前のキーから引き継いで補間する", () => {
    const K = loadKit();
    const frames = [{ t: 0, x: 1000, size: 800 }, { t: 1, x: 500, ease: "linear" }, { t: 2, size: 1200, ease: "linear" }];
    expect(K.keys(-1, frames)).toEqual({ x: 1000, size: 800 });
    expect(K.keys(0.5, frames).x).toBeCloseTo(750);
    expect(K.keys(0.5, frames).size).toBeCloseTo(900);
    expect(K.keys(1.5, frames)).toEqual({ x: 500, size: 1100 });
    expect(K.keys(5, frames)).toEqual({ x: 500, size: 1200 });
  });

  it("叩き・ジャンプ・イージングは時刻だけで決まる", () => {
    const K = loadKit();
    expect(K.punch(1, [1], 0.3)).toBe(1);
    expect(K.punch(1.3001, [1], 0.3)).toBe(0);
    expect(K.hop(1.25, 1, 0.5, 100).y).toBeCloseTo(-100);
    expect(K.hop(3, 1, 0.5, 100)).toEqual({ y: 0, sx: 1, sy: 1 });
    expect(K.anim(2, 1, 0.5, "outBack")).toBe(1);
  });

  it("長さ0の区間でも NaN にならない（レビューで見つかった不具合）", () => {
    const K = loadKit();
    expect(K.envelope(1, 0, 0.2, 0.8, 0)).toBe(1);
    expect(K.envelope(0, 0, 0, 1, 0.2)).toBe(1);
    expect(K.hop(1, 1, 0, 100)).toEqual({ y: 0, sx: 1, sy: 1 });
    const s = K.shake(1, 1, 0, 10, 1);
    expect([s.x, s.y, s.r].every(Number.isFinite)).toBe(true);
  });

  it("動画のプロンプトで道具箱の使い方を伝える", () => {
    const text = buildMotionPrompt({
      concept: { niche: "恋愛", target: "", topic: "", notes: "", durationSec: 10, hookId: "", styleId: "", paletteId: "", fontId: "", goal: "follow", tone: "" },
      script: { title: "t", caption: "", hashtags: [], coverText: "", scenes: [] },
      timeline: { fps: 30, duration: 5, scenes: [] },
      character: { kind: "rig", name: "ミルティ", concept: "", script: "" }
    } as unknown as Parameters<typeof buildMotionPrompt>[0]);
    expect(text).toContain("window.MGK");
    expect(text).toContain("K.transition");
    expect(text).toContain("キャラと文字を重ねない");
    expect(text).toContain("背景は1フレームも止めない");
  });
});

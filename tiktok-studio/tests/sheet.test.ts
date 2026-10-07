import { describe, expect, it } from "vitest";
import { findSprites, removeSheetBackground } from "../src/lib/sheet";

/** グラデーション背景に、色つきの四角を描いた画像を作る */
function makeSheet(width: number, height: number, rects: { x: number; y: number; w: number; h: number }[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const shade = 150 + Math.round((x / width) * 60); // 左から右へ明るくなる背景
      data.set([shade, shade - 10, shade - 5, 255], i);
    }
  }
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) data.set([20, 40, 90, 255], (y * width + x) * 4);
  }
  return data;
}

describe("キャラクターシートの切り出し", () => {
  it("グラデーションの背景を消し、キャラの部分は残す", () => {
    const data = makeSheet(200, 100, [{ x: 80, y: 20, w: 40, h: 60 }]);
    removeSheetBackground(data, 200, 100);
    expect(data[(5 * 200 + 5) * 4 + 3]).toBe(0);
    expect(data[(5 * 200 + 195) * 4 + 3]).toBe(0);
    expect(data[(50 * 200 + 100) * 4 + 3]).toBe(255);
  });

  it("離れているものは別々に、左上から順に並べる", () => {
    const data = makeSheet(300, 200, [
      { x: 200, y: 20, w: 40, h: 70 },
      { x: 20, y: 20, w: 40, h: 70 },
      { x: 20, y: 120, w: 60, h: 50 }
    ]);
    removeSheetBackground(data, 300, 200);
    const { boxes } = findSprites(data, 300, 200, { minArea: 100 });
    expect(boxes.map((b) => [b.x, b.y])).toEqual([
      [20, 20],
      [200, 20],
      [20, 120]
    ]);
  });

  it("細い部分でくっついた2体は分け、突き出た手は1体のまま", () => {
    // 2体（体の幅40）の間を、細い「耳」がつないでいる。左の体には小さな手が突き出ている
    const data = makeSheet(320, 160, [
      { x: 60, y: 20, w: 40, h: 120 },
      { x: 100, y: 30, w: 60, h: 6 },
      { x: 160, y: 20, w: 40, h: 120 },
      { x: 30, y: 80, w: 30, h: 8 }
    ]);
    removeSheetBackground(data, 320, 160);
    const { boxes } = findSprites(data, 320, 160, { minArea: 100 });
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.x).toBe(30);
  });
});

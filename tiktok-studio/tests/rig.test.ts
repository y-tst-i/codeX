import { describe, expect, it } from "vitest";
import { characterPromptSection } from "../src/lib/character";
import { buildRigCharacterScript, fillMissingPivots, parseRigJson, partNameOf, rigCapabilities } from "../src/lib/rigCharacter";

describe("パーツで組み立てるキャラ", () => {
  it("ZIPの中のパス付きファイル名からパーツ名を取り出す", () => {
    expect(partNameOf("rig_parts/arm_L.png")).toBe("arm_L");
    expect(partNameOf("mouth_open.PNG")).toBe("mouth_open");
    expect(partNameOf("check_composite.png")).toBeNull();
    expect(partNameOf("base_full.png")).toBeNull();
  });

  it("rig.json を読み、足りない関節はパーツの位置から補う", () => {
    const rig = parseRigJson(JSON.stringify({ canvas: { width: 1024, height: 1536 }, pivots: { body: [512, 1497], head: [512, 636], arm_L: [394, 714], bad: [1] } }));
    expect(rig.canvas).toEqual({ width: 1024, height: 1536 });
    expect(rig.pivots.arm_L).toEqual([394, 714]);
    expect(rig.pivots.bad).toBeUndefined();
    const filled = fillMissingPivots(rig.pivots, { ear_L: { x: 300, y: 20, w: 200, h: 400 }, arm_R: { x: 620, y: 700, w: 200, h: 400 } });
    expect(filled.arm_L).toEqual([394, 714]);
    expect(filled.ear_L).toEqual([400, 20 + 400 * 0.92]);
    expect(filled.arm_R![0]).toBeCloseTo(660);
    expect(filled.ear_R).toBeDefined();
  });

  it("v2 の rig.json（脚・黒目・視線の範囲）を読む", () => {
    const rig = parseRigJson(
      JSON.stringify({
        version: 2,
        canvas: { width: 2048, height: 3072 },
        pivots: { body: [1024, 2994], head: [1024, 1272], leg_L: [900, 2180] },
        anchors: { pupil_L: [890, 940], eyes: "x" },
        pupil_range: [28, 20]
      })
    );
    expect(rig.pivots.leg_L).toEqual([900, 2180]);
    expect(rig.anchors).toEqual({ pupil_L: [890, 940] });
    expect(rig.pupilRange).toEqual([28, 20]);
    expect(partNameOf("fx_heart_eyes.png")).toBe("fx_heart_eyes");
    expect(partNameOf("arms_heart.png")).toBe("arms_heart");
  });

  it("持っている素材から、使えるポーズ・漫符・歩き・視線を決める", () => {
    const v1 = rigCapabilities(["body", "head", "arm_L", "arm_R", "eyes_open", "mouth_closed"]);
    expect(v1.poses).toEqual(["idle", "point", "wave", "cheer", "shrug"]);
    expect(v1.fx).toEqual([]);
    expect(v1.walk).toBe(false);
    const v2 = rigCapabilities(["leg_L", "leg_R", "arm_R_chin", "arms_heart", "fx_blush", "fx_question", "eyes_white", "pupil_L", "pupil_R", "eyes_lids"]);
    expect(v2.poses).toEqual(["idle", "point", "wave", "cheer", "shrug", "think", "heart", "jump"]);
    expect(v2.fx).toEqual(["blush", "question"]);
    expect(v2.walk && v2.gaze).toBe(true);
  });

  it("足元と首の関節が無い rig.json はエラーにする", () => {
    expect(() => parseRigJson("{")).toThrow(/JSON/);
    expect(() => parseRigJson(JSON.stringify({ canvas: { width: 10, height: 10 }, pivots: { head: [1, 1] } }))).toThrow(/body/);
  });

  it("描画コードに素材と関節が入り、キャラが window.CHARACTER になる", () => {
    const script = buildRigCharacterScript(
      "ミルティ",
      { canvas: { width: 1024, height: 1536 }, pivots: { body: [512, 1497], head: [512, 636] }, offsets: { body: [300, 600], head: [320, 300] } },
      { body: "data:image/png;base64,AAAA", head: "data:image/png;base64,BBBB" }
    );
    expect(script).toContain('"ミルティ"');
    expect(script).toContain('kind:"rig"');
    expect(script).toContain("var TOP=300");
    const sandbox: { CHARACTER?: { name: string } } = {};
    // Image が無い環境でも、定義そのものは通る
    (globalThis as { Image?: unknown }).Image ??= class {};
    new Function("window", script)(sandbox);
    expect(sandbox.CHARACTER?.name).toBe("ミルティ");
  });

  it("動画用プロンプトで、パーツキャラの動かし方を伝える", () => {
    const text = characterPromptSection({ kind: "rig", name: "ミルティ", concept: "うさぎ", script: "", imageKeys: ["rig:body", "rig:leg_L", "rig:leg_R", "rig:fx_blush"] });
    expect(text).toContain("関節で動かす");
    expect(text).toContain("cheer=バンザイ");
    expect(text).toContain("lookY, fx, walk");
    expect(text).toContain("pose: idle / point / wave / cheer / shrug / jump");
    expect(text).toContain("fx（任意）: blush");
    expect(text).toContain("walk（任意）");
    expect(text).not.toContain("lookY（任意");
  });
});

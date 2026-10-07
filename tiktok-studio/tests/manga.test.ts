import { describe, expect, it } from "vitest";
import { isPanelAsset, isRefAsset, assetsPromptSection, unusedAssets, type AssetInfo } from "../src/lib/assets";
import { DEFAULT_CAST, buildCastSheetPrompt, buildPanelPrompt, castOf, mangaMotionSection, panelName } from "../src/lib/manga";
import { MGK_SCRIPT } from "../src/lib/mgKit";
import { buildScriptPrompt } from "../src/lib/prompts";
import { parseScript } from "../src/lib/script";
import type { Concept, Script } from "../src/lib/types";

const concept: Concept = {
  niche: "恋愛心理",
  target: "20代女性",
  topic: "返信が早い男の心理",
  notes: "",
  durationSec: 40,
  hookId: "question",
  styleId: "infographic",
  paletteId: "cream-red",
  fontId: "dela",
  goal: "save",
  tone: "やさしく",
  format: "manga"
};

const script: Script = {
  title: "返信",
  caption: "",
  hashtags: [],
  coverText: "",
  scenes: [
    { id: "a", role: "hook", narration: "返信が早い男って", reading: "", onScreenText: "", visual: "", emphasis: [], panels: [] },
    {
      id: "b",
      role: "drama",
      narration: "ミカは彼からの返信に驚いた",
      reading: "",
      onScreenText: "",
      visual: "",
      emphasis: [],
      panels: [
        { cast: ["kanojo"], shot: "夜の部屋でスマホを見るミカ | 上半身", line: "もう返信きた！", speaker: "kanojo", sfx: "ドキッ" },
        { cast: ["kare"], shot: "スマホを握るユウト", line: "", speaker: "", sfx: "" }
      ]
    }
  ]
};

describe("漫画ドラマ", () => {
  it("台本プロンプトに型と登場人物が入る（いつもの型には入らない）", () => {
    const prompt = buildScriptPrompt(concept, undefined, DEFAULT_CAST);
    expect(prompt).toContain("漫画ドラマ");
    expect(prompt).toContain("ID「kare」");
    expect(prompt).toContain("drama");
    expect(buildScriptPrompt({ ...concept, format: "standard" })).not.toContain("ID「kare」");
  });

  it("panels の無い古い台本も読み込める", () => {
    const parsed = parseScript(JSON.stringify({ title: "t", caption: "", hashtags: [], coverText: "", scenes: [{ role: "drama", narration: "x", reading: "", onScreenText: "", visual: "", emphasis: [] }] }));
    expect(parsed.scenes[0]!.panels).toEqual([]);
    expect(parsed.scenes[0]!.role).toBe("drama");
  });

  it("コマ絵の依頼は、シーン番号どおりの名前で、表を壊さない", () => {
    const { prompt, count } = buildPanelPrompt(script, DEFAULT_CAST, concept);
    expect(count).toBe(2);
    expect(prompt).toContain(`${panelName(2, 1)}.png`);
    expect(prompt).toContain("panel_02_2.png");
    expect(prompt).toContain("夜の部屋でスマホを見るミカ ／ 上半身");
    expect(buildCastSheetPrompt(DEFAULT_CAST, concept)).toContain("ref_cast_kanojo.png");
  });

  it("動画プロンプトの指示は、絵があるコマだけ名前で呼ぶ", () => {
    const section = mangaMotionSection(script, DEFAULT_CAST, ["panel_02_1"]);
    expect(section).toContain('"panel_02_1"');
    expect(section).toContain("ミカ（彼女）「もう返信きた！」");
    expect(section).not.toContain('"panel_02_2"');
    expect(mangaMotionSection({ ...script, scenes: [script.scenes[0]!] }, DEFAULT_CAST, [])).toBe("");
  });

  it("設定画は動画に入れず、コマ絵は背景として割り当てない", () => {
    const assets: AssetInfo[] = [
      { key: "img:ref_cast_kare", kind: "img", name: "ref_cast_kare", width: 1024, height: 1536, transparent: false },
      { key: "img:panel_02_1", kind: "img", name: "panel_02_1", width: 1024, height: 1024, transparent: false },
      { key: "img:bg_01", kind: "img", name: "bg_01", width: 1024, height: 1536, transparent: false }
    ];
    expect(isRefAsset("ref_cast_kare")).toBe(true);
    expect(isPanelAsset("panel_02_1")).toBe(true);
    const section = assetsPromptSection(assets, {}, [{ start: 0, end: 2, role: "hook" }]);
    expect(section).toContain("bg_01");
    expect(section).not.toContain("ref_cast_kare");
    expect(section).not.toContain("panel_02_1");
    expect(unusedAssets('K.image(ctx,"bg_01")', assets).unused).toEqual(["panel_02_1"]);
    expect(castOf([])).toBe(DEFAULT_CAST);
  });

  it("K.manga のコマ割りは、ページの中に収まる", () => {
    const win: { MGK?: { manga: { layout(kind: string): { x: number; y: number; w: number; h: number; pts: number[][] }[] } } } = {};
    new Function("window", MGK_SCRIPT)(win);
    const counts: Record<string, number> = { "1": 1, "2v": 2, "2d": 2, "3": 3, "4": 4 };
    for (const [kind, n] of Object.entries(counts)) {
      const rects = win.MGK!.manga.layout(kind);
      expect(rects).toHaveLength(n);
      for (const r of rects) for (const [x, y] of r.pts) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1080);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1920);
      }
    }
  });
});

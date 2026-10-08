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

describe("登場人物の声・背景のまとめ方・Lottie", () => {
  it("登場人物のセリフのシーンだけ、その人の声に差し替える", async () => {
    const { sceneVoice } = await import("../src/lib/manga");
    const base = { voiceName: "Kore", direction: "", model: "m", engine: "aivis" as const, localSpeaker: 1, localSpeakerName: "まお" };
    const cast = [{ ...DEFAULT_CAST[0]!, voice: { aivis: { speaker: 9, name: "阿井田 茂" }, gemini: "Puck" } }, DEFAULT_CAST[1]!];
    expect(sceneVoice(base, { speaker: "" }, cast)).toBe(base);
    expect(sceneVoice(base, { speaker: "kare" }, cast).localSpeaker).toBe(9);
    expect(sceneVoice(base, { speaker: "kanojo" }, cast)).toBe(base);
    expect(sceneVoice({ ...base, engine: "voicevox" }, { speaker: "kare" }, cast).localSpeaker).toBe(1);
    expect(sceneVoice({ ...base, engine: "gemini" }, { speaker: "kare" }, cast).voiceName).toBe("Puck");
  });

  it("背景は場所ごとに2〜4枚にまとめ、漫画ドラマのシーンには割り当てない", async () => {
    const { backgroundPlan, buildImagePrompt } = await import("../src/lib/assets");
    const roles = ["hook", "drama", "drama", "drama", "body", "body", "body", "twist", "cta", "loop"];
    const plan = backgroundPlan(roles);
    expect(plan.slice(1, 4)).toEqual([null, null, null]);
    expect(Math.max(...plan.map((p) => p ?? 0)) + 1).toBe(3);
    expect(backgroundPlan(Array(17).fill("body")).filter((p, i, a) => a.indexOf(p) === i)).toHaveLength(4);
    const prompt = buildImagePrompt(concept, { ...script, scenes: roles.map((role, i) => ({ id: String(i), role, narration: `セリフ${i}`, reading: "", onScreenText: "", visual: "", emphasis: [] })) } as Script);
    expect(prompt).toContain("bg_03.png");
    expect(prompt).not.toContain("bg_04.png");
    expect(prompt.indexOf("① 小物")).toBeLessThan(prompt.indexOf("② 背景"));
  });

  it("Lottie は LottieFiles の素材置き場だけから、かぶらない名前で取り込む", async () => {
    const { isLottieAssetUrl } = await import("../lottieBridge");
    const { lottieAssetName } = await import("../src/lib/lottieClient");
    expect(isLottieAssetUrl("https://assets-v2.lottiefiles.com/a/x/y.json")).toBe(true);
    expect(isLottieAssetUrl("http://assets-v2.lottiefiles.com/a/x/y.json")).toBe(false);
    expect(isLottieAssetUrl("https://lottiefiles.com.evil.com/y.json")).toBe(false);
    expect(isLottieAssetUrl("https://assets-v2.lottiefiles.com/a/x/y.png")).toBe(false);
    expect(lottieAssetName("question mark", [])).toBe("lottie_question_mark");
    expect(lottieAssetName("heart", ["lottie_heart", "lottie_heart_2"])).toBe("lottie_heart_3");
  });
});

describe("Lottie のおまかせ", () => {
  it("台本の言葉から、シーンがばらけるように選び、呼びかけには必ずフォローを入れる", async () => {
    const { planLotties } = await import("../src/lib/lottieClient");
    const picks = planLotties(
      [
        { role: "hook", narration: "LINEの返信が早い男、実は…" },
        { role: "drama", narration: "もう返信きた！" },
        { role: "body", narration: "これは心理学で返報性っていうの" },
        { role: "twist", narration: "でも実は、早すぎるのは逆効果" },
        { role: "cta", narration: "フォローしてね" }
      ],
      "恋愛心理"
    );
    expect(picks).toHaveLength(4);
    expect(picks[0]).toMatchObject({ query: "follow button", scene: 4 });
    expect(new Set(picks.map((p) => p.query)).size).toBe(4);
    expect(picks.map((p) => p.query)).toContain("message notification");
    expect(picks.map((p) => p.query)).toContain("brain");
  });

  it("文字・写真入りや重い・長いアニメは外す", async () => {
    const { lottieProblem } = await import("../src/lib/lottieClient");
    const ok = { fr: 30, ip: 0, op: 60, w: 512, h: 512, layers: [{ ty: 4 }], assets: [] };
    expect(lottieProblem(ok, 20_000)).toBeNull();
    expect(lottieProblem({ ...ok, layers: [{ ty: 5 }] }, 20_000)).toBe("文字入り");
    expect(lottieProblem({ ...ok, assets: [{ p: "img.png" }] }, 20_000)).toBe("写真入り");
    expect(lottieProblem(ok, 900_000)).toBe("重すぎる");
    expect(lottieProblem({ ...ok, op: 600 }, 20_000)).toBe("長さが合わない");
  });
});

describe("描画エラーへの強さ", () => {
  it("色やコマ枠が足りなくても、道具箱は落ちずに描く", async () => {
    const { MGK_SCRIPT: kit } = await import("../src/lib/mgKit");
    const win: { MGK?: Record<string, any> } = {};
    new Function("window", kit)(win);
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, key) => (key in target ? target[key as string] : (...args: unknown[]) => (calls.push(String(key)), key === "createPattern" ? {} : undefined)),
      set: (target, key, value) => ((target[key as string] = value), true)
    });
    const K = win.MGK!;
    expect(() => K.manga.panel(ctx, 1, { x: 0, y: 0, w: 500, h: 500 }, {})).not.toThrow();
    expect(() => K.manga.panel(ctx, 1, undefined, {})).not.toThrow();
    expect(() => K.manga.tone(ctx, { x: 0, y: 0, w: 100, h: 100 })).not.toThrow();
  });

  it("どの時刻・どの関数で落ちたかを伝える", async () => {
    const { describeRenderError } = await import("../src/lib/mg");
    function drawDrama() {
      const rects: number[][] | undefined = undefined;
      return rects![0];
    }
    let error: unknown;
    try {
      drawDrama();
    } catch (e) {
      error = e;
    }
    const text = describeRenderError(error, 3.2);
    expect(text).toContain("t=3.20秒");
    expect(text).toContain("drawDrama");
    expect(text).toContain("undefined のまま");
  });
});

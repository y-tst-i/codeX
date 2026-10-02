import { describe, expect, it } from "vitest";
import { assetName, assetsPromptSection, buildImagePrompt, unusedAssets, useAssetsRequest } from "../src/lib/assets";
import { visemesFromQuery } from "../src/lib/localTts";
import { DEFAULT_AUDIO, autoCues, mixAll, sanitizeCues } from "../src/lib/sfx";
import type { Timeline } from "../src/lib/types";

const timeline = {
  duration: 6,
  fps: 30,
  scenes: [
    { id: "a", index: 0, role: "hook", start: 0, end: 2, speechStart: 0.1, speechEnd: 1.9, emphasis: ["脈あり"], captions: [{ text: "脈ありサイン", start: 0.1, end: 1.9 }] },
    { id: "b", index: 1, role: "twist", start: 2, end: 4, speechStart: 2.1, speechEnd: 3.9, emphasis: [], captions: [] },
    { id: "c", index: 2, role: "cta", start: 4, end: 6, speechStart: 4.1, speechEnd: 5.9, emphasis: [], captions: [] }
  ]
} as unknown as Timeline;

describe("効果音・BGM", () => {
  it("タイムラインから、転換・登場・オチ・CTAに効果音を付ける", () => {
    const types = autoCues(timeline).map((c) => c.type);
    expect(types).toContain("pop");
    expect(types).toContain("whoosh");
    expect(types).toContain("impact");
    expect(types).toContain("ding");
  });

  it("HTMLの指定は、知らない種類・範囲外を捨てる", () => {
    const cues = sanitizeCues([{ t: 1, type: "pop" }, { t: 2, type: "laser" }, { t: 99, type: "ding" }, { t: 0.5, type: "impact", volume: 9 }], 6);
    expect(cues).toEqual([{ t: 1, type: "pop", volume: 1 }, { t: 0.5, type: "impact", volume: 1.5 }]);
    expect(sanitizeCues("x", 6)).toEqual([]);
  });

  it("声が鳴っている間はBGMを下げ、音割れしないようにまとめる", () => {
    const rate = 1000;
    const voice = new Float32Array(3000);
    for (let i = 1000; i < 2000; i++) voice[i] = 0.5 * Math.sin(i);
    const bgm = new Float32Array(500).fill(1);
    const out = mixAll({ voice, sampleRate: rate, duration: 3, bgm, sfx: [{ cue: { t: 2.5, type: "pop" }, samples: new Float32Array(10).fill(5) }], settings: { ...DEFAULT_AUDIO, bgmVolume: 0.5, duck: 0.8 } });
    const quiet = Math.abs(out[1500]! - voice[1500]!);
    expect(out[700]!).toBeGreaterThan(quiet);
    expect(Math.max(...out)).toBeLessThanOrEqual(1);
  });
});

describe("母音の口パク", () => {
  it("audio_query のモーラから、母音ごとの時刻を出す", () => {
    const v = visemesFromQuery({
      prePhonemeLength: 0.1,
      speedScale: 2,
      accent_phrases: [{ moras: [{ consonant_length: 0.1, vowel: "a", vowel_length: 0.2 }, { vowel: "N", vowel_length: 0.1 }, { consonant_length: 0.04, vowel: "cl", vowel_length: 0.06 }], pause_mora: { vowel: "pau", vowel_length: 0.4 } }, { moras: [{ vowel: "O", vowel_length: 0.2 }] }]
    });
    expect(v.map((x) => x.v)).toEqual(["a", "N", "x", "o"]);
    expect(v[0]!.t).toBeCloseTo(0.15);
    expect(v[0]!.e).toBeCloseTo(0.25);
    expect(v[3]!.t).toBeCloseTo(0.25 + 0.05 + 0.05 + 0.2);
  });
});

describe("素材", () => {
  it("ファイル名から素材名を作り、プロンプトに使い方を書く", () => {
    expect(assetName("assets/bg_01.png")).toBe("bg_01");
    expect(assetName("my photo.jpg")).toBe("my_photo");
    const text = assetsPromptSection(
      [
        { key: "img:bg_01", kind: "img", name: "bg_01", width: 1024, height: 1536, transparent: false },
        { key: "img:prop_phone", kind: "img", name: "prop_phone", width: 512, height: 512, transparent: true },
        { key: "lottie:confetti", kind: "lottie", name: "confetti", width: 0, height: 0, transparent: false }
      ],
      { bg_01: "夜のカフェ" }
    );
    expect(text).toContain('K.kenBurns(ctx, t, "bg_01"');
    expect(text).toContain("夜のカフェ");
    expect(text).toContain('K.image(ctx, "prop_phone"');
    expect(text).toContain('K.lottie(ctx, t, "confetti"');
    expect(assetsPromptSection([], {})).toBe("");
  });

  it("背景画像があれば、シーンごとに必ず使うよう割り当て、使っていないHTMLを見分ける", () => {
    const assets = [
      { key: "img:bg_01", kind: "img" as const, name: "bg_01", width: 1024, height: 1536, transparent: false },
      { key: "img:bg_02", kind: "img" as const, name: "bg_02", width: 1024, height: 1536, transparent: false },
      { key: "img:prop_heart", kind: "img" as const, name: "prop_heart", width: 512, height: 512, transparent: true }
    ];
    const text = assetsPromptSection(assets, {}, [
      { start: 0, end: 2, role: "hook" },
      { start: 2, end: 4, role: "body" },
      { start: 4, end: 6, role: "cta" }
    ]);
    expect(text).toContain("必ず使う");
    expect(text).toContain('| 1（hook） | 0.00〜2.00s | "bg_01" |');
    expect(text).toContain('| 3（cta） | 4.00〜6.00s | "bg_01" |');
    expect(text).toContain("すべてのシーンで、背景画像を K.kenBurns");
    expect(unusedAssets("K.bg.mesh(ctx,t,[])", assets).used).toEqual([]);
    expect(unusedAssets('K.kenBurns(ctx,t,"bg_02",0,2)', assets).used).toEqual(["bg_02"]);
    expect(useAssetsRequest(assets)).toContain("bg_01 / bg_02");
  });

  it("ChatGPT向けの素材の依頼文に、シーンごとのファイル名と禁止事項が入る", () => {
    const text = buildImagePrompt(
      { niche: "恋愛", target: "", topic: "", notes: "", durationSec: 10, hookId: "", styleId: "", paletteId: "", fontId: "", goal: "follow", tone: "" } as never,
      { title: "脈あり", caption: "", hashtags: [], coverText: "", scenes: [{ id: "a", role: "hook", narration: "こんにちは", reading: "", onScreenText: "", visual: "", emphasis: [] }] } as never
    );
    expect(text).toContain("bg_01.png");
    expect(text).toContain("文字・人物・キャラクターを入れない");
    expect(text).toContain("prop_");
  });
});

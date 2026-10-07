import { describe, expect, it } from "vitest";
import { applyIdea, buildIdeasPrompt, parseIdeas } from "../src/lib/ideas";
import { DEFAULT_SETTINGS, newProject } from "../src/lib/project";

const concept = { ...newProject(DEFAULT_SETTINGS).concept, niche: "恋愛心理学・脈ありサイン" };

describe("ネタ帳", () => {
  it("プロンプトにジャンル・フックの型・使用済みネタが入る", () => {
    const prompt = buildIdeasPrompt(concept, ["LINEの返信速度でわかる本音"]);
    expect(prompt).toContain("恋愛心理学・脈ありサイン");
    expect(prompt).toContain("shock-number");
    expect(prompt).toContain("LINEの返信速度でわかる本音");
  });

  it("返答を読み込み、知らないフックの型は先頭の型にする", () => {
    const ideas = parseIdeas('```json\n{"ideas":[{"topic":"好きな人にだけ出る仕草","hookId":"ranking","hookLine":"第3位から","why":"自分ごと","notes":"諸説あり"},{"topic":"x","hookId":"???","hookLine":"","why":"","notes":""}]}\n```');
    expect(ideas).toHaveLength(2);
    expect(ideas[0]?.hookId).toBe("ranking");
    expect(ideas[1]?.hookId).toBe("shock-number");
    expect(ideas.every((idea) => !idea.used && idea.id)).toBe(true);
  });

  it("選んだネタをテーマ・フック・参考情報に入れる", () => {
    const [idea] = parseIdeas('{"ideas":[{"topic":"脈ありLINE","hookId":"question","hookLine":"その返信、脈ありかも","why":"","notes":"返信速度の話"}]}');
    const next = applyIdea(concept, idea!);
    expect(next.topic).toBe("脈ありLINE");
    expect(next.hookId).toBe("question");
    expect(next.notes).toContain("その返信、脈ありかも");
    expect(next.notes).toContain("返信速度の話");
    expect(next.niche).toBe(concept.niche);
  });

  it("形が違えばエラー", () => {
    expect(() => parseIdeas('{"ideas": []}')).toThrow();
  });
});

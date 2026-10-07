import { describe, expect, it } from "vitest";
import { extractHtml, lintHtml, prepareHostHtml } from "../src/lib/mg";

describe("HTMLの取り出しと検査", () => {
  it("```html ブロックを取り出す", () => {
    expect(extractHtml("コンセプト\n```html\n<!doctype html><html></html>\n```\n以上")).toBe("<!doctype html><html></html>");
  });

  it("フェンスがなくても<html>〜</html>を取り出す", () => {
    expect(extractHtml("前置き <!doctype html><html><body></body></html> 後書き")).toBe("<!doctype html><html><body></body></html>");
  });

  it("HTMLがなければエラー", () => {
    expect(() => extractHtml("ごめんなさい")).toThrow();
  });

  it("自動再生を止めるフラグを<head>の先頭に入れる", () => {
    const html = prepareHostHtml("<html><head><title>x</title></head></html>");
    expect(html.indexOf("__MG_HOST__")).toBeLessThan(html.indexOf("<title>"));
  });

  it("契約違反を見つける", () => {
    const problems = lintHtml('<script src="https://cdn.example.com/gsap.js"></script>');
    expect(problems.some((p) => p.includes("window.MG"))).toBe(true);
    expect(problems.some((p) => p.includes("stage"))).toBe(true);
    expect(problems.some((p) => p.includes("外部スクリプト"))).toBe(true);
    expect(lintHtml('<canvas id="stage"></canvas><script>window.MG = {}</script>')).toEqual([]);
  });
});

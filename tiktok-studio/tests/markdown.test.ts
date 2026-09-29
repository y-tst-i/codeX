import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../src/lib/markdown";

describe("ガイド用Markdown", () => {
  it("見出し・箇条書き・引用・段落", () => {
    const blocks = parseMarkdown("# 題\n\n- a\n- b\n\n1. x\n\n> 引用\n\n本文");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "list", "list", "quote", "paragraph"]);
  });

  it("太字・コード・リンク", () => {
    expect(parseInline("a **b** `c` [d](https://e.com)").map((p) => p.type)).toEqual(["text", "bold", "text", "code", "text", "link"]);
  });
});

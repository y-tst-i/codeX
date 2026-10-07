import { describe, expect, it } from "vitest";
import { mergeKeys, stripKeys } from "../src/lib/backup";

describe("引っ越し用バックアップ", () => {
  it("キーを含めない設定では、APIキーだけを空にする", () => {
    const out = JSON.parse(stripKeys(JSON.stringify({ anthropicKey: "sk-ant-x", geminiKey: "g", claudeModel: "m" })));
    expect(out).toEqual({ anthropicKey: "", geminiKey: "", claudeModel: "m" });
  });

  it("キー無しのバックアップを読み込んでも、引っ越し先に入っているキーは消さない", () => {
    const merged = JSON.parse(mergeKeys(JSON.stringify({ anthropicKey: "", geminiKey: "", claudeModel: "new" }), JSON.stringify({ anthropicKey: "here", geminiKey: "g2" })));
    expect(merged).toEqual({ anthropicKey: "here", geminiKey: "g2", claudeModel: "new" });
    const fromBackup = JSON.parse(mergeKeys(JSON.stringify({ anthropicKey: "backup" }), JSON.stringify({ anthropicKey: "here" })));
    expect(fromBackup.anthropicKey).toBe("backup");
  });
});

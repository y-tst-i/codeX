import { EXPRESSIONS, EXPRESSION_LABELS, POSES, POSE_LABELS, type CharacterDraw } from "./character";

export interface CharacterCheck {
  ok: boolean;
  problems: string[];
  name: string;
  /** 全表情・全ポーズを並べたプレビュー画像 */
  sheet: Blob | null;
}

/**
 * キャラクターのコードを画面外のiframeで動かし、
 * 全表情・全ポーズを並べた確認用シートを作る。描画が決定的かも調べる。
 */
export async function checkCharacter(script: string, timeoutMs = 20000): Promise<CharacterCheck> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", left: "-20000px", top: "0", width: "400px", height: "400px", border: "0" });
  document.body.appendChild(frame);
  const problems: string[] = [];
  try {
    const safe = script.replace(/<\/script/gi, "<\\/script");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("キャラクターの読み込みがタイムアウトしました")), timeoutMs);
      frame.addEventListener("load", () => {
        clearTimeout(timer);
        resolve();
      });
      frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><script>window.__ERR__=[];addEventListener("error",function(e){window.__ERR__.push(String(e.message))});</script></head><body><script>${safe}</script></body></html>`;
    });

    const win = frame.contentWindow as (Window & { CHARACTER?: CharacterDraw; __ERR__?: string[]; MG_ASSETS_READY?: Promise<unknown> }) | null;
    if (win?.MG_ASSETS_READY) await Promise.race([win.MG_ASSETS_READY, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    const character = win?.CHARACTER;
    if (!character || typeof character.draw !== "function") {
      return { ok: false, problems: ["window.CHARACTER.draw が見つかりません", ...(win?.__ERR__ ?? [])], name: "", sheet: null };
    }

    const cell = 200;
    const columns = Math.max(EXPRESSIONS.length, POSES.length);
    const sheet = document.createElement("canvas");
    sheet.width = columns * cell;
    sheet.height = cell * 2 + 60;
    const ctx = sheet.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvasを初期化できません");
    ctx.fillStyle = "#f4f1fb";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";

    const drawAt = (i: number, row: number, opts: Record<string, unknown>, label: string) => {
      const x = i * cell + cell / 2;
      const y = row * (cell + 30) + cell - 6;
      try {
        ctx.save();
        character.draw(ctx, { x, y, size: cell * 0.85, t: 0.5, mouth: 0.4, look: 0, ...opts });
        ctx.restore();
      } catch (error) {
        problems.push(`${label} の描画でエラー: ${(error as Error).message}`);
      }
      ctx.fillStyle = "#333";
      ctx.fillText(label, x, y + 22);
    };
    EXPRESSIONS.forEach((expression, i) => drawAt(i, 0, { expression, pose: "idle" }, EXPRESSION_LABELS[expression] ?? expression));
    POSES.forEach((pose, i) => drawAt(i, 1, { expression: "happy", pose }, POSE_LABELS[pose] ?? pose));

    // 同じ引数で2回描いて同じ絵になるか（決定性）
    const probe = document.createElement("canvas");
    probe.width = probe.height = 160;
    const p = probe.getContext("2d", { willReadFrequently: true });
    if (p) {
      const snap = () => {
        p.clearRect(0, 0, 160, 160);
        character.draw(p, { x: 80, y: 150, size: 140, t: 1.23, expression: "surprised", pose: "point", mouth: 0.7, look: 0.3 });
        return Array.from(p.getImageData(0, 0, 160, 160).data.filter((_, k) => k % 97 === 0)).join(",");
      };
      try {
        const a = snap();
        character.draw(p, { x: 80, y: 150, size: 140, t: 3.3, expression: "sad", pose: "wave", mouth: 0, look: -1 });
        const b = snap();
        if (a !== b) problems.push("同じ引数でも描くたびに絵が変わります（Math.random や前回の状態を使っています）");
      } catch (error) {
        problems.push(`描画でエラー: ${(error as Error).message}`);
      }
    }
    problems.push(...(win?.__ERR__ ?? []).map((m) => `実行時エラー: ${m}`));

    const blob = await new Promise<Blob | null>((resolve) => sheet.toBlob(resolve, "image/png"));
    return { ok: problems.length === 0, problems, name: character.name ?? "", sheet: blob };
  } finally {
    frame.remove();
  }
}

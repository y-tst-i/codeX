/** 育成ガイド表示用の最小Markdownパーサ（見出し・箇条書き・引用・段落のみ） */

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", text: paragraph.join("") });
    paragraph = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1]!.length as 1 | 2 | 3, text: heading[2]!.trim() });
    } else if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const text = (bullet ?? numbered)![1]!;
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) last.items.push(text);
      else blocks.push({ type: "list", ordered, items: [text] });
    } else if (quote) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "quote") last.text += quote[1];
      else blocks.push({ type: "quote", text: quote[1] ?? "" });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

export type Inline = { type: "text" | "bold" | "code"; text: string } | { type: "link"; text: string; href: string };

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ type: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) result.push({ type: "bold", text: match[1] });
    else if (match[2] !== undefined) result.push({ type: "code", text: match[2] });
    else if (match[3] !== undefined && match[4] !== undefined) result.push({ type: "link", text: match[3], href: match[4] });
    last = index + match[0].length;
  }
  if (last < text.length) result.push({ type: "text", text: text.slice(last) });
  return result;
}

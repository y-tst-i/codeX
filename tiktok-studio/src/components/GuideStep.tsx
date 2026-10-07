import playbook from "../../docs/TikTok育成プレイブック.md?raw";
import { parseInline, parseMarkdown } from "../lib/markdown";

const blocks = parseMarkdown(playbook);

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "bold") return <b key={i}>{part.text}</b>;
        if (part.type === "code") return <code key={i}>{part.text}</code>;
        if (part.type === "link")
          return (
            <a key={i} href={part.href} target="_blank" rel="noreferrer">
              {part.text}
            </a>
          );
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
}

export function GuideStep() {
  return (
    <div className="guide">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h1" | "h2" | "h3";
            return (
              <Tag key={i}>
                <InlineText text={block.text} />
              </Tag>
            );
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i}>
                <InlineText text={block.text} />
              </blockquote>
            );
          default:
            return (
              <p key={i}>
                <InlineText text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}

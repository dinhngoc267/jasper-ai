import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for blog post bodies.
 *
 * This is intentionally hand-rolled rather than a dependency (remark/
 * react-markdown etc.): the writer agent's output uses a narrow, predictable
 * subset of markdown (h2 headings, paragraphs, bold, links, unordered
 * lists), so a small parser avoids adding a new dependency for one post.
 * If future posts need richer markdown (tables, code blocks, nested lists),
 * swap this for a real parser rather than extending it further.
 */

let keyCounter = 0;
function nextKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

/** Parses inline markdown (**bold**, [text](url)) into React nodes. */
function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // **bold**
      nodes.push(<strong key={nextKey("b")}>{parseInline(match[1])}</strong>);
    } else {
      // [linkText](href)
      const linkText = match[2];
      const href = match[3];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a
          key={nextKey("a")}
          href={href}
          className="text-[var(--blue)] underline underline-offset-2 hover:opacity-80"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {parseInline(linkText)}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/** Renders a markdown body (frontmatter and H1 already stripped) as React nodes. */
export function renderMarkdown(markdown: string): ReactNode {
  const blocks = markdown.split(/\n\n+/).filter((b) => b.trim().length > 0);

  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines[0]?.startsWith("## ")) {
      return (
        <h2
          key={nextKey("h2")}
          className="mt-12 mb-4 text-2xl font-semibold tracking-tight text-[var(--ink)] first:mt-0"
        >
          {parseInline(lines[0].slice(3))}
        </h2>
      );
    }

    if (lines.every((l) => l.startsWith("- "))) {
      return (
        <ul key={nextKey("ul")} className="my-6 flex flex-col gap-3">
          {lines.map((l) => (
            <li key={nextKey("li")} className="flex gap-3 text-[17px] leading-relaxed text-[var(--ink-soft)]">
              <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-[var(--blue)]" />
              <span>{parseInline(l.slice(2))}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={nextKey("p")} className="mb-6 text-[17px] leading-relaxed text-[var(--ink-soft)]">
        {parseInline(lines.join(" "))}
      </p>
    );
  });
}

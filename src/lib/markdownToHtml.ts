// Minimal, safe Markdown -> HTML for crawler-visible content written in this
// repo (Startup Pedia). It covers the subset the content uses: paragraphs,
// - and 1. lists (with indented continuation lines), ### subheadings, **bold**,
// *italic*, `code` and [links](/path, #anchor or https://). Text is escaped
// before any markup is added. api/newspaper-og.ts keeps its own variant for
// database-authored articles, which only allows absolute links.

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inline = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^)\s]*)\)/g, (_match, label: string, href: string) => {
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

export function markdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const out: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItem: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushItem = () => {
    if (listItem.length) {
      out.push(`<li>${inline(listItem.join("<br />"))}</li>`);
      listItem = [];
    }
  };
  const closeList = () => {
    flushItem();
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      // h1 is the page title and h2 the entry's section headings.
      const level = Math.min(Math.max(heading[1].length, 3), 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushParagraph();
      flushItem();
      const wanted = ul ? "ul" : "ol";
      if (listType !== wanted) {
        closeList();
        listType = wanted;
        out.push(`<${wanted}>`);
      }
      listItem.push((ul ? ul[1] : ol![1]));
      continue;
    }
    // An indented line inside a list continues the current item.
    if (listType && /^\s+/.test(raw)) {
      listItem.push(line);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return out.join("\n");
}

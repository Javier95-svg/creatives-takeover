/**
 * Prepare article body Markdown for reading.
 *
 * Authored content arrives with inconsistent paragraph spacing: some bodies use
 * blank lines between paragraphs (proper Markdown), but pasted text often uses a
 * single newline per paragraph. With `remark-breaks`, a single newline renders
 * as a tight <br>, which makes paragraphs look glued together.
 *
 * Rule:
 * - If the body already contains blank lines, the author structured it on
 *   purpose — leave it untouched (single newlines stay as intentional breaks).
 * - Otherwise, treat every line as its own paragraph so the text gets real
 *   vertical spacing when rendered.
 */
export function normalizeArticleMarkdown(raw: string | null | undefined): string {
  if (!raw) return "";

  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Already has blank-line paragraph breaks — respect the author's structure.
  if (/\n[ \t]*\n/.test(text)) {
    return text;
  }

  // No blank lines: promote each non-empty line to a paragraph.
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

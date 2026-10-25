// Search-snippet helpers for newspaper articles. api/newspaper-og.ts carries a
// copy (serverless functions do not import from src/); tests/story-meta.test.ts
// keeps the two in step.

// Plain text of the article's opening paragraphs, for the meta description.
// Excerpts are one-line teasers ("When one rule rewrote the game."), so on their
// own they made search snippets that never said what the article covers.
export function openingText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|!\[|>|\||```|---)/.test(block))
    .map((block) =>
      block
        .replace(/<[^>]+>/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  let text = '';
  for (const paragraph of paragraphs) {
    text = text ? `${text} ${paragraph}` : paragraph;
    if (text.length >= 120) break;
  }
  return text;
}

export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.substring(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}...`;
}

export const stripEmoji = (text: string) => text.replace(/\s*\p{Extended_Pictographic}️?/gu, '').trim();

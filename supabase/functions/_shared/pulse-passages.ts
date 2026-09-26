// Bounded, deterministic passages from published article Markdown. No HTML,
// image URLs or instructions in source text gain execution privileges.
export function pulsePassages(body: unknown, query: string): string[] {
  if (typeof body !== 'string') return [];
  const text = body.slice(0, 120000).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  const chunks = text.split(/\n\s*\n/).flatMap(paragraph => {
    const clean = paragraph.trim();
    return clean.match(/[\s\S]{1,900}/g) ?? [];
  }).filter(chunk => chunk.trim().length > 25);
  return chunks.map((content, index) => ({ content, index,
    score: terms.reduce((sum, term) => sum + (content.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3)
    .sort((a, b) => a.index - b.index).map(item => item.content);
}

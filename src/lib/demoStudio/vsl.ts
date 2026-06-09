export const VSL_VARIATION_LIMIT = 3;
export const VSL_VARIATION_LABELS = ['A', 'B', 'C'] as const;

export interface ParsedLoomUrl {
  videoId: string | null;
  sharedUrl: string;
  embedUrl: string | null;
}

export function canAddVsl(currentCount: number): boolean {
  return currentCount < VSL_VARIATION_LIMIT;
}

export function getNextVslLabel(existingLabels: Array<string | null | undefined>): string {
  const used = new Set(existingLabels.filter(Boolean).map((label) => String(label).toUpperCase()));
  return VSL_VARIATION_LABELS.find((label) => !used.has(label)) ?? `V${existingLabels.length + 1}`;
}

export function normalizeLoomUrl(rawUrl: string): ParsedLoomUrl {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Paste a Loom share link first.');
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error('Enter a valid Loom URL.');
  }

  if (!/loom\.com$/i.test(url.hostname) && !/\.loom\.com$/i.test(url.hostname)) {
    throw new Error('Use a Loom share or embed URL.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const idFromShare = segments[0] === 'share' ? segments[1] : null;
  const idFromEmbed = segments[0] === 'embed' ? segments[1] : null;
  const videoId = idFromShare || idFromEmbed || null;
  const sharedUrl = videoId ? `https://www.loom.com/share/${videoId}` : url.toString();
  const embedUrl = videoId ? `https://www.loom.com/embed/${videoId}` : null;

  return { videoId, sharedUrl, embedUrl };
}

export function getLaunchPublishMissing(readiness: { hasPublishedDemo: boolean; hasVsl: boolean }): string[] {
  const missing: string[] = [];
  if (!readiness.hasPublishedDemo) missing.push('Publish at least one interactive demo.');
  if (!readiness.hasVsl) missing.push('Attach at least one recorded VSL variation.');
  return missing;
}

export function calculateSignupRate(signups: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return Math.round((signups / impressions) * 1000) / 10;
}

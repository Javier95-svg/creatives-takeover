// Share helpers for public Demo Studio launch pages (/p/:slug).
//
// Channel set and URL shapes deliberately match the article share row at
// /newspaper/:slug (src/pages/StoryArticle.tsx) so both public surfaces behave
// the same way. Every target is a plain URL opened with window.open, so nothing
// here needs a Content-Security-Policy change.

export type ShareIntentChannel = 'x' | 'linkedin' | 'facebook';
export type ShareChannel = ShareIntentChannel | 'copy' | 'native';

/**
 * The text a sharer posts. Deliberately the founder's headline and their link,
 * with no "via @CreativesTakeover" suffix: hijacking someone's post is what
 * makes a hosted page stop feeling like the founder's own.
 */
export function buildShareText(headline: string, projectName: string): string {
  return (headline?.trim() || projectName?.trim() || '');
}

export function getShareIntentUrl(channel: ShareIntentChannel, pageUrl: string, title: string): string {
  const url = encodeURIComponent(pageUrl);
  const text = encodeURIComponent(title);
  switch (channel) {
    case 'x':
      return `https://x.com/intent/tweet?text=${text}&url=${url}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }
}

/**
 * The post handed to the founder in the Launch Composer. Founders do not write
 * this unprompted, and an empty text box at publish time is where sharing dies.
 */
export function buildFounderPost(projectName: string, headline: string | null | undefined, url: string): string {
  const lines = [`I've been building ${projectName}.`];
  if (headline?.trim()) lines.push('', headline.trim());
  lines.push('', `Here's a 2-minute demo and the pitch: ${url}`);
  return lines.join('\n');
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

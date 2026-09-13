// Share targets for public Demo Studio launch pages (/p/:slug).
//
// Every target is a plain URL opened as a link navigation, so none of these need
// a Content-Security-Policy change: CSP `form-action` does not apply to link
// navigation, and nothing here is embedded or scripted.

export type ShareChannel = 'x' | 'linkedin' | 'whatsapp' | 'email' | 'copy' | 'native';

export interface ShareTarget {
  channel: Exclude<ShareChannel, 'copy' | 'native'>;
  label: string;
  href: string;
}

/**
 * The message a visitor posts. Deliberately the founder's words plus their link:
 * no "via @CreativesTakeover" suffix. Hijacking a visitor's post is what makes a
 * hosted page stop feeling like the founder's own.
 */
export function buildShareText(headline: string, projectName: string): string {
  const line = headline?.trim() || projectName?.trim() || '';
  return line ? `"${line}"` : '';
}

export function buildShareTargets(url: string, text: string): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const combined = encodeURIComponent(text ? `${text} ${url}` : url);
  return [
    {
      channel: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      channel: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      channel: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${combined}`,
    },
    {
      channel: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedText}&body=${combined}`,
    },
  ];
}

/**
 * The post we hand the founder in the composer. Founders do not write this
 * unprompted, and an empty text box at publish time is where sharing dies.
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

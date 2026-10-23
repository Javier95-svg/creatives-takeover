// Guards server-side fetches of founder-supplied links (project-import-extract)
// so they can only reach public websites, never this platform's own network,
// cloud metadata endpoints or a private address. Pure, so node:test covers it.

export type PublicUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.intranet', '.corp'];

function isIpv4Literal(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Only http(s) pages on a public host name: no IP literals, ports, credentials or local names. */
export function checkPublicUrl(input: string): PublicUrlCheck {
  let raw = (input || '').trim();
  if (!raw) return { ok: false, reason: 'Enter a link.' };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That doesn't look like a web address." };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'Only http and https links work.' };
  if (url.username || url.password) return { ok: false, reason: 'Links with a username or password are not allowed.' };
  if (url.port && url.port !== '80' && url.port !== '443') return { ok: false, reason: 'Links on a custom port are not allowed.' };

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || host.includes(':') || isIpv4Literal(host)) {
    return { ok: false, reason: 'Use the website name, not an IP address.' };
  }
  if (!host.includes('.') || host === 'localhost' || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: 'Use a public website address.' };
  }

  return { ok: true, url };
}

function ipv4ToNumber(ip: string): number | null {
  if (!isIpv4Literal(ip)) return null;
  const parts = ip.split('.').map(Number);
  if (parts.some((part) => part > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

const PRIVATE_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
];

/** True for loopback, private, link-local, carrier-grade NAT, multicast and reserved addresses. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const v4 = ipv4ToNumber(ip);
  if (v4 !== null) {
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return ((v4 & mask) >>> 0) === ((ipv4ToNumber(base)! & mask) >>> 0);
    });
  }
  if (!ip.includes(':')) return true; // not an address we understand: refuse
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (ip === '::' || ip === '::1') return true;
  const first = parseInt(ip.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  return false;
}

/** Visible text of an HTML page, without scripts, styles or tags. */
export function htmlToText(html: string): { title: string; description: string; text: string } {
  const decode = (value: string) => value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const description = decode(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
      ?? html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1]
      ?? '',
  ).trim();
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return { title, description, text };
}

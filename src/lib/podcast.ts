// Helpers for the Podcast ("Founders Unleashed") section. Episodes are backed by
// YouTube: we store the URL + extracted video id, then derive the thumbnail and the
// in-platform player embed from the id so visitors never leave the platform.

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube.com';
const YOUTUBE_IFRAME_API_ID = 'youtube-iframe-api';

let youtubeConnectionsWarmed = false;
let youtubeIframeApiPromise: Promise<YouTubeIframeApi> | null = null;

export interface YouTubeIframePlayer {
  destroy: () => void;
  playVideo: () => void;
}

interface YouTubePlayerEvent {
  target: YouTubeIframePlayer;
  data: number;
}

interface YouTubePlayerOptions {
  videoId: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: (event: YouTubePlayerEvent) => void;
    onStateChange: (event: YouTubePlayerEvent) => void;
    onError: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeIframeApi {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubeIframePlayer;
  PlayerState: {
    BUFFERING: number;
    PLAYING: number;
    CUED: number;
  };
}

type YouTubeApiWindow = Window & {
  YT?: YouTubeIframeApi;
  onYouTubeIframeAPIReady?: () => void;
};

/**
 * Extract the 11-character YouTube video id from any common form:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/embed/ID | /shorts/ID | /live/ID | /v/ID
 * - a bare 11-char id
 * Returns null when no valid id can be found.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  if (YT_ID.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return YT_ID.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v');
      if (v && YT_ID.test(v)) return v;
      const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // not a URL — fall through to a loose scan
  }

  const loose = raw.match(/[a-zA-Z0-9_-]{11}/);
  return loose ? loose[0] : null;
}

/** A reliably-present thumbnail (hqdefault always exists for a valid video). */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/watch?v=${videoId}`;
}

/** Load YouTube's API only after a visitor asks to play an episode. */
export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube playback requires a browser'));
  }

  const apiWindow = window as YouTubeApiWindow;
  if (apiWindow.YT?.Player) return Promise.resolve(apiWindow.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
    const previousReady = apiWindow.onYouTubeIframeAPIReady;
    apiWindow.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (apiWindow.YT?.Player) {
        resolve(apiWindow.YT);
      } else {
        youtubeIframeApiPromise = null;
        reject(new Error('YouTube iframe API initialized without a player'));
      }
    };

    const existing = document.getElementById(YOUTUBE_IFRAME_API_ID) as HTMLScriptElement | null;
    if (existing) return;

    const script = document.createElement('script');
    script.id = YOUTUBE_IFRAME_API_ID;
    script.src = `${YOUTUBE_EMBED_ORIGIN}/iframe_api`;
    script.async = true;
    script.onerror = () => {
      youtubeIframeApiPromise = null;
      reject(new Error('Unable to load the YouTube iframe API'));
    };
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

function ensureHeadLink(id: string, rel: string, href: string, as?: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  document.head.appendChild(link);
}

/**
 * Warm only the connections needed by the YouTube player.
 *
 * Prefetching the embed document used to make every visitor download YouTube work
 * before choosing a video. The autoplay URL opened by the player was different, so
 * that speculative download was not reliably reused and competed with the page load.
 */
export function warmYouTubeEmbed(videoId: string): void {
  if (!YT_ID.test(videoId) || youtubeConnectionsWarmed) return;
  youtubeConnectionsWarmed = true;

  ensureHeadLink('podcast-youtube-preconnect', 'preconnect', YOUTUBE_EMBED_ORIGIN);
  ensureHeadLink('podcast-ytimg-preconnect', 'preconnect', 'https://i.ytimg.com');
  ensureHeadLink('podcast-gstatic-preconnect', 'preconnect', 'https://www.gstatic.com');
}

/** Normalize a free-text hashtag into a `#word` token (letters/digits only). */
export function normalizePodcastHashtag(value: string): string {
  const cleaned = (value || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  return cleaned ? `#${cleaned}` : '';
}

/** Parse a comma/space/newline separated string into a unique list of `#tags`. */
export function parseHashtagsInput(input: string): string[] {
  const tokens = (input || '').split(/[\s,]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const tag = normalizePodcastHashtag(token);
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

/**
 * Normalize a free-text guest website into an absolute, linkable URL.
 *
 * Admins type sites the way people say them ("getmarketing.com"), which is not
 * a usable href — a schemeless value resolves relative to /podcast. Anything
 * without a scheme is assumed https, and only http(s) is allowed through so a
 * pasted `javascript:` or `data:` value can never reach an anchor.
 * Returns null when the input cannot be read as a web address.
 */
export function normalizeGuestWebsite(input: string | null | undefined): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  // A bare "//host" is protocol-relative, not a path — give it an explicit scheme too.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // A host with no dot ("localhost", a stray word) is a typo, not a site.
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * The short, human label for a guest website: the hostname without `www.` and
 * without the trailing slash `URL` adds. Falls back to the raw value so a link
 * never renders blank.
 */
export function guestWebsiteLabel(input: string | null | undefined): string {
  const normalized = normalizeGuestWebsite(input);
  if (!normalized) return (input || '').trim();

  const url = new URL(normalized);
  const path = url.pathname.replace(/\/$/, '');
  return `${url.hostname.replace(/^www\./, '')}${path}`;
}

/** Hosts accepted for each social field, so a mislabeled link cannot slip in. */
const SOCIAL_HOSTS = {
  linkedin: ['linkedin.com'],
  instagram: ['instagram.com', 'instagr.am'],
} as const;

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
// LinkedIn vanity names allow letters, digits and hyphens.
const LINKEDIN_HANDLE = /^[A-Za-z0-9-]{3,100}$/;

function hostMatches(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.replace(/^www./, '').toLowerCase();
  return allowed.some((base) => host === base || host.endsWith(`.${base}`));
}

/**
 * Normalize a guest's LinkedIn into an absolute profile URL.
 *
 * Accepts a full URL, a schemeless "linkedin.com/in/name", or a bare vanity
 * name (assumed to be a person, so it resolves under /in/). Anything hosted
 * somewhere other than LinkedIn is rejected rather than rendered under a
 * LinkedIn label. Returns null when the input cannot be read as a profile.
 */
export function normalizeLinkedInUrl(input: string | null | undefined): string | null {
  const raw = (input || '').trim().replace(/^@/, '');
  if (!raw) return null;

  if (LINKEDIN_HANDLE.test(raw) && !raw.includes('.')) {
    return `https://www.linkedin.com/in/${raw}`;
  }

  const url = normalizeGuestWebsite(raw);
  if (!url) return null;
  return hostMatches(new URL(url).hostname, SOCIAL_HOSTS.linkedin) ? url : null;
}

/**
 * Normalize a guest's Instagram into an absolute profile URL.
 *
 * Accepts "@handle", a bare handle, a schemeless "instagram.com/handle", or a
 * full URL. Non-Instagram hosts are rejected. Returns null when unusable.
 */
export function normalizeInstagramUrl(input: string | null | undefined): string | null {
  const raw = (input || '').trim().replace(/^@/, '');
  if (!raw) return null;

  if (INSTAGRAM_HANDLE.test(raw) && !raw.includes('.')) {
    return `https://www.instagram.com/${raw}`;
  }

  const url = normalizeGuestWebsite(raw);
  if (!url) return null;
  return hostMatches(new URL(url).hostname, SOCIAL_HOSTS.instagram) ? url : null;
}

/**
 * The @handle shown next to a social icon: the last meaningful path segment of
 * the profile URL. Falls back to an empty string when there is no handle to
 * show (a company page, say), so the caller can render the icon label alone.
 */
export function socialHandle(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    // "/in" alone is a bare route, not a handle.
    return last && last !== 'in' && last !== 'company' ? `@${last}` : '';
  } catch {
    return '';
  }
}

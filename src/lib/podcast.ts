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

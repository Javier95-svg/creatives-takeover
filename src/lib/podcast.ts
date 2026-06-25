// Helpers for the Podcast ("Founders Unleashed") section. Episodes are backed by
// YouTube: we store the URL + extracted video id, then derive the thumbnail and the
// in-platform player embed from the id so visitors never leave the platform.

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

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

/** Privacy-friendly embed URL for the in-platform player. */
export function youtubeEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
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

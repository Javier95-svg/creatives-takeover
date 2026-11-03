// Shared by the share-card generators (og-launch, og-profile).

const MAX_IMAGE_BYTES = 1_000_000;

export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function monogram(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : 'C';
}

/**
 * ImageResponse streams, so a try/catch around it will not reliably catch a bad
 * remote image — it emits a broken response and the share card dies silently.
 * Validate the image up front instead and fall back to a monogram. Founders can
 * paste arbitrary URLs, so this is not a theoretical case.
 */
export async function loadSafeImageDataUrl(candidate: string | null | undefined): Promise<string | null> {
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const projectHost = new URL(process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co').hostname;
    const ownPublicObject = url.hostname === projectHost && url.pathname.startsWith('/storage/v1/object/public/');
    const googleAvatar = url.hostname.endsWith('.googleusercontent.com');
    if (url.protocol !== 'https:' || url.port || url.username || url.password || (!ownPublicObject && !googleAvatar)) return null;

    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].toLowerCase().trim();
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) return null;
    const length = Number(res.headers.get('content-length') ?? '0');
    if (length && length > MAX_IMAGE_BYTES) return null;
    if (!res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const binary = chunks.map((chunk) => Array.from(chunk, (byte) => String.fromCharCode(byte)).join('')).join('');
    return `data:${type};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

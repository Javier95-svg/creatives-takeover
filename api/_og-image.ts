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
export async function isUsableImage(candidate: string | null | undefined): Promise<boolean> {
  if (!candidate) return false;
  if (!/^https:\/\//i.test(candidate)) return false;
  try {
    const res = await fetch(candidate);
    if (!res.ok) return false;
    const type = res.headers.get('content-type') ?? '';
    if (!type.toLowerCase().startsWith('image/')) return false;
    const length = Number(res.headers.get('content-length') ?? '0');
    if (length && length > MAX_IMAGE_BYTES) return false;
    return true;
  } catch {
    return false;
  }
}

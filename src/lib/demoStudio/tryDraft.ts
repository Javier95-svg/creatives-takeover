// Anonymous /demo-studio/try draft persistence. A visitor's generated demo lives
// only in React state + in-memory blob URLs, which do not survive the full-page
// auth redirect. To capture the conversion we serialize the draft into
// sessionStorage (same store the events module relies on), with screenshots
// downscaled to data URLs so 2-3 images comfortably fit the ~5MB quota.

const TRY_DRAFT_KEY = 'demo_studio_try_draft';

export interface TryDraftStep {
  dataUrl: string;
  title: string;
  caption: string;
  speaker_notes: string;
  hotspot_label: string;
}

export interface TryDraft {
  v: 1;
  productName: string;
  contextUrl: string;
  steps: TryDraftStep[];
}

/** Downscale an image File to a JPEG data URL, capping the longest edge. */
export async function fileToDownscaledDataUrl(
  file: File,
  maxEdge = 1600,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close?.();
  }
}

/** Reconstruct a File from a data URL (used to re-upload after the redirect). */
export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

/**
 * Persist the draft. Returns false if it could not be stored (e.g. quota), so
 * the caller can degrade gracefully rather than silently lose the draft.
 */
export function saveTryDraft(draft: TryDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(TRY_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readTryDraft(): TryDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(TRY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TryDraft;
    if (parsed?.v !== 1 || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTryDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(TRY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Rewrites Supabase Storage public URLs onto the image-transformation endpoint
 * so we stop shipping full-resolution uploads into small render targets.
 *
 * Measured 2026-08-18 against production storage:
 *   mentor-pictures   100 files, avg 724 kB, largest 5.0 MB  -> rendered at 96px
 *   story-banners     116 files, avg 454 kB, largest 4.9 MB
 * Edge logs showed these objects taking 1.4-3.0 s each, which is the bulk of the
 * "everything loads slowly" symptom: a card grid pulls a dozen of them at once.
 *
 * Stored rows already hold raw `/object/public/` URLs, so this has to happen at
 * render time rather than at upload time.
 */

/** Widths we ask Storage for. Keeping the set small maximises CDN cache hits. */
const WIDTH_BUCKETS = [48, 96, 160, 320, 640, 960, 1280] as const;

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

export interface StorageImageOptions {
  /** Target CSS width in px. Snapped up to the next bucket and doubled for retina. */
  width: number;
  /** Defaults to `width` for square avatars; pass explicitly for banners. */
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

function snapWidth(width: number): number {
  // Ask for 2x so the image stays sharp on retina displays.
  const target = Math.ceil(width * 2);
  return WIDTH_BUCKETS.find((bucket) => bucket >= target) ?? WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

/**
 * Returns a transformed URL when `url` is a Supabase Storage public object URL,
 * and the input untouched otherwise (external hosts, data:/blob:, already-
 * transformed render URLs, empty values). Never throws on malformed input.
 */
export function storageImageUrl(
  url: string | null | undefined,
  options: StorageImageOptions,
): string | undefined {
  if (!url) return undefined;

  // Already transformed, or not a storage object URL we recognise.
  if (url.includes(RENDER_PUBLIC)) return url;
  if (!url.includes(OBJECT_PUBLIC)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const width = snapWidth(options.width);
  const height = options.height === undefined ? width : snapWidth(options.height);

  parsed.pathname = parsed.pathname.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
  parsed.searchParams.set("width", String(width));
  parsed.searchParams.set("height", String(height));
  parsed.searchParams.set("resize", options.resize ?? "cover");
  parsed.searchParams.set("quality", String(options.quality ?? 70));

  return parsed.toString();
}

/** srcset builder for wide imagery (banners, hero art) where 1x/2x both matter. */
export function storageImageSrcSet(
  url: string | null | undefined,
  widths: number[],
  options?: Omit<StorageImageOptions, "width">,
): string | undefined {
  if (!url || !url.includes(OBJECT_PUBLIC)) return undefined;

  return widths
    .map((width) => {
      const src = storageImageUrl(url, { ...options, width });
      return src ? `${src} ${snapWidth(width)}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}

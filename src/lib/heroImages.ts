import { supabase } from "@/integrations/supabase/client";

export const HERO_IMAGE_BUCKET = "hero-images";
export const HERO_IMAGE_CACHE_KEY = "ct:hero-images:v1";
export const HERO_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const HERO_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const HERO_IMAGE_TARGET_WIDTHS = [320, 480, 640] as const;

export type HeroImageRecord = {
  alt_text: string | null;
  image_url: string;
  position: number;
  storage_path: string | null;
  updated_at: string | null;
};

export function isAllowedHeroImageType(fileType: string) {
  return HERO_IMAGE_ALLOWED_TYPES.includes(fileType as (typeof HERO_IMAGE_ALLOWED_TYPES)[number]);
}

export function extractHeroStoragePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://creatives-takeover.com";
    const url = new URL(imageUrl, baseOrigin);
    const marker = "/hero-images/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export function normalizeHeroImages(images: HeroImageRecord[]) {
  return [...images]
    .filter((image) => image.position >= 1 && image.position <= 4)
    .sort((left, right) => left.position - right.position);
}

export function getHeroImageFreshness(images: HeroImageRecord[]) {
  return normalizeHeroImages(images)
    .map((image) => image.updated_at || "")
    .join("|");
}

export function shouldReplaceCachedHeroImages(currentImages: HeroImageRecord[], nextImages: HeroImageRecord[]) {
  const normalizedCurrent = normalizeHeroImages(currentImages);
  const normalizedNext = normalizeHeroImages(nextImages);

  if (normalizedCurrent.length !== normalizedNext.length) return true;

  if (getHeroImageFreshness(normalizedCurrent) !== getHeroImageFreshness(normalizedNext)) {
    return true;
  }

  return normalizedCurrent.some((image, index) => {
    const nextImage = normalizedNext[index];
    return image.image_url !== nextImage.image_url || image.storage_path !== nextImage.storage_path;
  });
}

export function readCachedHeroImages() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HERO_IMAGE_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as HeroImageRecord[];
    if (!Array.isArray(parsed)) return [];

    return normalizeHeroImages(
      parsed.filter(
        (image): image is HeroImageRecord =>
          Boolean(image) &&
          typeof image.position === "number" &&
          typeof image.image_url === "string" &&
          typeof image.alt_text !== "undefined",
      ),
    );
  } catch {
    return [];
  }
}

export function writeCachedHeroImages(images: HeroImageRecord[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(HERO_IMAGE_CACHE_KEY, JSON.stringify(normalizeHeroImages(images)));
  } catch {
    // Ignore storage quota and serialization failures.
  }
}

export function buildHeroImageUrl(storagePath: string, width: number) {
  return supabase.storage
    .from(HERO_IMAGE_BUCKET)
    .getPublicUrl(storagePath, {
      transform: {
        width,
        height: width,
        resize: "cover",
        quality: 70,
      },
    }).data.publicUrl;
}

export function buildHeroImageSrcSet(storagePath: string) {
  return HERO_IMAGE_TARGET_WIDTHS.map((width) => `${buildHeroImageUrl(storagePath, width)} ${width}w`).join(", ");
}

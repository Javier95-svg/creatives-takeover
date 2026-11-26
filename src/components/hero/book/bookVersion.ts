// PREVIEW ONLY (branch hero-book). ?hero=1|2|3|4 picks a two-column hero.
import { captureEvent } from "@/lib/analytics";

// 1-4: first round of right-hand panels. a-c: story reels of the platform.
export type BookVersion = 1 | 2 | 3 | 4 | "a" | "b" | "c";

export function readBookVersion(search: string): BookVersion | null {
  const value = new URLSearchParams(search).get("hero");
  if (value === "1" || value === "2" || value === "3" || value === "4") return Number(value) as BookVersion;
  return value === "a" || value === "b" || value === "c" ? value : null;
}

/** One event for every CTA in every version, so they can be compared. */
export function trackBook(version: BookVersion, cta: string, extra: Record<string, unknown> = {}) {
  captureEvent("hero_book_cta_clicked", { hero_version: version, cta, page: "/", ...extra });
}

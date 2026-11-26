// PREVIEW ONLY (branch hero-book). ?hero=1|2|3|4 picks a two-column hero.
import { captureEvent } from "@/lib/analytics";

export type BookVersion = 1 | 2 | 3 | 4;

export function readBookVersion(search: string): BookVersion | null {
  const value = new URLSearchParams(search).get("hero");
  return value === "1" || value === "2" || value === "3" || value === "4" ? (Number(value) as BookVersion) : null;
}

/** One event for every CTA in every version, so they can be compared. */
export function trackBook(version: BookVersion, cta: string, extra: Record<string, unknown> = {}) {
  captureEvent("hero_book_cta_clicked", { hero_version: version, cta, page: "/", ...extra });
}

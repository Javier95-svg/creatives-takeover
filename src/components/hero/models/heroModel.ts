// PREVIEW ONLY (branch hero-models). Three candidate signed-out heroes,
// switched with ?hero=a|b|c on a Vercel preview so Javier can compare them.
// Without the parameter the live hero renders unchanged.
import { captureEvent } from "@/lib/analytics";

export type HeroModelId = "a" | "b" | "c";

export function readHeroModel(search: string): HeroModelId | null {
  const value = new URLSearchParams(search).get("hero");
  return value === "a" || value === "b" || value === "c" ? value : null;
}

/** One event for every model CTA, so the three can be compared side by side. */
export function trackHeroModelCta(model: HeroModelId, cta: string, extra: Record<string, unknown> = {}) {
  captureEvent("hero_model_cta_clicked", { hero_model: model, cta, page: "/", ...extra });
}

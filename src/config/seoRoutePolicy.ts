export type CanonicalRouteAlias = {
  source: string;
  destination: string;
};

/**
 * Canonical URL policy shared by client routing, edge handling, and SEO tests.
 * Alias URLs are intentionally absent from sitemaps and prerender output.
 */
export const CANONICAL_ROUTE_ALIASES: CanonicalRouteAlias[] = [
  { source: "/insighta/vc-search", destination: "/vc-search" },
  { source: "/insighta/email-templates", destination: "/email-templates" },
  { source: "/insighta/accelerator-hunt", destination: "/accelerator-hunt" },
  { source: "/insighta/pitch-deck-analyzer", destination: "/pitch-deck-analyzer" },
  { source: "/insighta/test", destination: "/insighta-test" },
  { source: "/software", destination: "/build" },
  { source: "/services", destination: "/marketplace" },
];

export const ROBOTS_DISALLOW_PATHS = [
  "/admin/", "/auth/", "/login", "/sign-up", "/signup", "/forgot-password",
  "/reset-password", "/onboarding", "/dashboard", "/projects-dashboard", "/referral-program",
  "/accountability", "/saved-mentors", "/account", "/messages", "/profile", "/setup-quiz",
  "/files", "/focus-funnel", "/ai-goals", "/core-metrics", "/routine", "/weekly-mission",
  "/tasks", "/subscription-success", "/creatives-takeover", "/mentorship/book/",
  "/mentorship/my-bookings", "/mentorship/admin/", "/co-founder/create", "/co-founder/edit/",
  "/investors/admin/", "/newspaper/admin/", "/stories/admin/", "/w/", "/api/", "/rag-test",
  "/test-phase1",
];

const PRIVATE_EXACT_ROUTES = new Set([
  "/login",
  "/sign-up",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/dashboard",
  "/projects-dashboard",
  "/referral-program",
  "/accountability",
  "/saved-mentors",
  "/account",
  "/setup-quiz",
  "/files",
  "/focus-funnel",
  "/ai-goals",
  "/core-metrics",
  "/routine",
  "/weekly-mission",
  "/tasks",
  "/subscription-success",
  "/creatives-takeover",
  "/rag-test",
  "/test-phase1",
]);

const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/auth",
  "/messages",
  "/profile",
  "/mentorship/book/",
  "/mentorship/my-bookings",
  "/mentorship/admin",
  "/co-founder/create",
  "/co-founder/edit/",
  "/investors/admin/",
  "/newspaper/admin",
  "/stories/admin",
  "/w/",
];

// Every first path segment explicitly owned by the SPA. Keeping this list at the
// edge prevents the catch-all rewrite from turning arbitrary paths into soft 404s
// while preserving dynamic routes below known product areas.
const KNOWN_APP_ROOT_SEGMENTS = new Set([
  "about", "pricing", "subscription-success", "build", "contact", "faq", "resources",
  "answers", "startup-guide", "services", "software", "mentorship", "marketplace",
  "co-founder", "admin", "investors", "community", "podcast", "newspaper", "stories",
  "careers", "prompt-library", "privacy-policy", "data-privacy", "terms", "ip-policy",
  "unsubscribe", "bizmap-ai", "pmf-lab", "tech-stack", "icp-builder", "icp",
  "decision-sprint", "validate", "demo-studio", "demo-studio-try", "p", "demo", "embed",
  "waitlist", "waitlist-maker", "w", "pmf-survey", "directories", "mvp-builder",
  "mvp-scope", "go-to-market", "client-acquisition", "auth", "login", "sign-up", "signup",
  "forgot-password", "reset-password", "onboarding", "dashboard", "projects-dashboard",
  "referral-program", "accountability", "saved-mentors", "account", "setup-quiz", "files",
  "focus-funnel", "ai-goals", "core-metrics", "routine", "weekly-mission", "tasks",
  "insighta", "vc-search", "email-templates", "accelerator-hunt", "traction-engine",
  "pitch-deck-analyzer", "insighta-test", "demo-calls", "messages", "profile",
  "creatives-takeover", "rag-test", "test-phase1",
]);

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const normalized = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  return normalized || "/";
}

export function isPrivateRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return PRIVATE_EXACT_ROUTES.has(path) || PRIVATE_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function isKnownAppRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === "/" || path === "/index.html") return true;
  const rootSegment = path.slice(1).split("/")[0];
  return KNOWN_APP_ROOT_SEGMENTS.has(rootSegment);
}

export function canonicalDestinationFor(pathname: string): string | null {
  const path = normalizePathname(pathname);
  return CANONICAL_ROUTE_ALIASES.find((alias) => alias.source === path)?.destination ?? null;
}

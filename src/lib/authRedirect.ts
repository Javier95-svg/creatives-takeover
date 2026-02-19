export const ONBOARDING_RETURN_KEY = "onboarding_return_url";

const AUTH_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function sanitizeReturnPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback;

  const trimmed = path.trim();
  if (!trimmed) return fallback;
  if (!isSafeInternalPath(trimmed)) return fallback;
  if (AUTH_PATH_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return fallback;

  return trimmed;
}

export function buildOnboardingPath(returnPath?: string | null): string {
  const safeReturn = sanitizeReturnPath(returnPath, "/dashboard");
  if (safeReturn === "/dashboard") return "/onboarding";
  return `/onboarding?return=${encodeURIComponent(safeReturn)}`;
}

export function persistOnboardingReturn(path: string | null | undefined): void {
  const safeReturn = sanitizeReturnPath(path, "/dashboard");
  localStorage.setItem(ONBOARDING_RETURN_KEY, safeReturn);
}

export function getOnboardingReturn(fallback = "/dashboard"): string {
  const stored = localStorage.getItem(ONBOARDING_RETURN_KEY);
  return sanitizeReturnPath(stored, fallback);
}

export function consumeOnboardingReturn(fallback = "/dashboard"): string {
  const safeReturn = getOnboardingReturn(fallback);
  localStorage.removeItem(ONBOARDING_RETURN_KEY);
  return safeReturn;
}

export function appendReturnParam(path: string, returnPath?: string | null): string {
  const safeReturn = sanitizeReturnPath(returnPath, "/dashboard");
  if (safeReturn === "/dashboard") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}return=${encodeURIComponent(safeReturn)}`;
}

import { supabase } from "@/integrations/supabase/client";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { getSafeLocalStorage } from "@/lib/safeStorage";

export const COMPACT_BRIEF_TIMEOUT_MS = 15_000;
export const GUEST_ARTIFACT_TIMEOUT_MS = 65_000;
export const HERO_GUEST_ARTIFACT_KEY = "ct_hero_guest_artifact_v1";

export interface HeroDecisionBrief {
  personaName: string;
  roleLine: string;
  primarySegment: string;
  urgentProblem: string;
  buyingTrigger: string;
  nonFitSegment: string;
  messagingHook: string;
  validationStep: string;
}

export type HeroGenerationStatus =
  | "compact_generating"
  | "compact_ready"
  | "deep_running"
  | "deep_ready"
  | "deep_failed"
  | "failed";

export interface HeroGuestArtifactRef {
  artifactId: string;
  resumeToken: string;
  expiresAt: string;
}

export interface HeroGuestArtifactSnapshot {
  success: boolean;
  artifactId: string;
  artifactType?: "icp" | "demo";
  source?: string;
  compact: HeroDecisionBrief | null;
  artifact: StoredIcpArtifact | null;
  generationStatus: HeroGenerationStatus;
  claimState?: "unclaimed" | "claiming" | "claimed" | "failed";
  nativeArtifactId?: string | null;
  expiresAt?: string;
  error?: string;
  errorCode?: string;
}

export interface StartHeroGenerationResult extends HeroGuestArtifactSnapshot {
  resumeToken: string;
}

export interface ClaimHeroArtifactResult {
  success: boolean;
  pending?: boolean;
  status?: string;
  analysisId?: string;
  artifactId?: string;
  artifact?: StoredIcpArtifact;
  error?: string;
  errorCode?: string;
}

export class HeroGenerationError extends Error {
  errorCode: string | null;

  constructor(message: string, errorCode: string | null = null) {
    super(message);
    this.name = "HeroGenerationError";
    this.errorCode = errorCode;
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HeroGenerationError(`${label} timed out`, "TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readFunctionError(error: unknown) {
  const context = (error as { context?: unknown })?.context;
  if (!context || typeof (context as Response).json !== "function") return null;
  try {
    return await (context as Response).clone().json() as { error?: string; errorCode?: string };
  } catch {
    return null;
  }
}

async function invokeHero<T>(body: unknown, timeoutMs: number, label: string): Promise<T> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("icp-analyzer", { body }),
    timeoutMs,
    label,
  );
  if (error) {
    const details = await readFunctionError(error);
    throw new HeroGenerationError(details?.error || label, details?.errorCode || null);
  }
  return data as T;
}

function normalizeCompact(value: Partial<HeroDecisionBrief> | null | undefined): HeroDecisionBrief | null {
  if (!value?.personaName || !value.primarySegment || !value.urgentProblem || !value.validationStep) return null;
  return {
    personaName: value.personaName,
    roleLine: value.roleLine ?? "",
    primarySegment: value.primarySegment,
    urgentProblem: value.urgentProblem,
    buyingTrigger: value.buyingTrigger ?? "",
    nonFitSegment: value.nonFitSegment ?? "",
    messagingHook: value.messagingHook ?? "",
    validationStep: value.validationStep,
  };
}

export function persistHeroGuestArtifact(ref: HeroGuestArtifactRef) {
  try {
    getSafeLocalStorage().setItem(HERO_GUEST_ARTIFACT_KEY, JSON.stringify(ref));
  } catch {
    // The URL is still a durable fallback when storage is unavailable.
  }
}

export function readHeroGuestArtifact(): HeroGuestArtifactRef | null {
  try {
    const raw = getSafeLocalStorage().getItem(HERO_GUEST_ARTIFACT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<HeroGuestArtifactRef>;
    if (!value.artifactId || !value.resumeToken || !value.expiresAt || Date.parse(value.expiresAt) <= Date.now()) {
      getSafeLocalStorage().removeItem(HERO_GUEST_ARTIFACT_KEY);
      return null;
    }
    return value as HeroGuestArtifactRef;
  } catch {
    return null;
  }
}

export function buildHeroResumePath(resumeToken: string) {
  return `/?resume=${encodeURIComponent(resumeToken)}`;
}

export function buildHeroClaimReturnPath(resumeToken: string) {
  return `/icp-builder?unlock=1&guest=${encodeURIComponent(resumeToken)}`;
}

export async function startHeroIcpGeneration(description: string): Promise<StartHeroGenerationResult> {
  const data = await invokeHero<Partial<StartHeroGenerationResult>>(
    { operation: "start_hero_generation", description, source: "homepage_hero" },
    COMPACT_BRIEF_TIMEOUT_MS,
    "Compact brief generation failed",
  );
  if (!data.artifactId || !data.resumeToken || !data.expiresAt) {
    throw new HeroGenerationError(data.error || "The result could not be preserved.", data.errorCode || "INVALID_RESPONSE");
  }
  const result: StartHeroGenerationResult = {
    success: data.success === true,
    artifactId: data.artifactId,
    resumeToken: data.resumeToken,
    expiresAt: data.expiresAt,
    compact: normalizeCompact(data.compact),
    artifact: data.artifact ?? null,
    generationStatus: data.generationStatus ?? "deep_running",
    error: data.error,
    errorCode: data.errorCode,
  };
  persistHeroGuestArtifact(result);
  return result;
}

export async function loadHeroGuestArtifact(resumeToken: string): Promise<HeroGuestArtifactSnapshot> {
  const data = await invokeHero<Partial<HeroGuestArtifactSnapshot>>(
    { operation: "load_guest_artifact", resumeToken },
    COMPACT_BRIEF_TIMEOUT_MS,
    "Could not restore this result",
  );
  if (!data.success || !data.artifactId || !data.generationStatus) {
    throw new HeroGenerationError(data.error || "This result is no longer available.", data.errorCode || "NOT_FOUND");
  }
  return {
    success: true,
    artifactId: data.artifactId,
    artifactType: data.artifactType,
    source: data.source,
    compact: normalizeCompact(data.compact),
    artifact: data.artifact ?? null,
    generationStatus: data.generationStatus,
    claimState: data.claimState,
    nativeArtifactId: data.nativeArtifactId,
    expiresAt: data.expiresAt,
  };
}

export async function retryHeroDeepGeneration(resumeToken: string) {
  return invokeHero<{ success: boolean; generationStatus?: HeroGenerationStatus; error?: string }>(
    { operation: "retry_guest_deep", resumeToken },
    COMPACT_BRIEF_TIMEOUT_MS,
    "Could not retry the full brief",
  );
}

export async function claimHeroGuestArtifact(resumeToken: string): Promise<ClaimHeroArtifactResult> {
  return invokeHero<ClaimHeroArtifactResult>(
    { operation: "claim_guest_artifact", resumeToken },
    GUEST_ARTIFACT_TIMEOUT_MS,
    "Could not save this result",
  );
}

export function resolveHeroGenerationErrorType(error: unknown) {
  if (error instanceof HeroGenerationError && error.errorCode) return error.errorCode.toLowerCase();
  if (error instanceof Error && /timed out/i.test(error.message)) return "timeout";
  return "api_error";
}

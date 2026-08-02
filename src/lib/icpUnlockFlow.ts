// Ungated first output. Guests see the whole brief - customer, pain, build and
// moat - plus the decision brief, with no blur, truncation or lock.
//
// This replaces a half-gate that showed only customer + pain. In the 60 days to
// 2026-08-01 every single person who reached that wall left: 6 people, 61
// `icp_builder_abandoned` events between them, roughly ten hits each. They had
// already done the work; walling them at the moment value arrived cost us the
// highest-intent visitors of the month. The account ask now comes after the
// output, and abuse is bounded by a per-token rate limit rather than a wall.
export const ICP_GUEST_VISIBLE_SECTIONS = ["customer", "pain", "build", "moat"] as const;

export type IcpDraftSaveResult = {
  success?: boolean;
  status?: string;
  analysisId?: string | null;
};

export type IcpPostSaveStep = {
  name: string;
  run: () => Promise<unknown>;
};

export function isIcpDraftSaveReady(result: IcpDraftSaveResult | null | undefined): result is IcpDraftSaveResult & { analysisId: string } {
  return (
    result?.success === true &&
    result.status === "draft_ready" &&
    typeof result.analysisId === "string" &&
    result.analysisId.trim().length > 0
  );
}

export function buildIcpUnlockNavigationPath(analysisId: string) {
  return `/icp/draft/${analysisId}?source=icp-unlock`;
}

export function isZeroCreditDeductionFailureDetails(details: { errorCode?: string | null; requiredCredits?: number | null } | null | undefined) {
  return details?.errorCode === "DEDUCTION_FAILED" && details.requiredCredits === 0;
}

export function buildIcpSaveFallbackPreviewRequest<T extends { mode?: unknown }>(request: T) {
  return {
    ...request,
    mode: "preview" as const,
  };
}

export function buildIcpSaveExistingArtifactRequest(artifact: unknown) {
  return {
    operation: "save_existing_artifact" as const,
    artifact,
  };
}

export async function runIcpPostSaveSteps(
  steps: IcpPostSaveStep[],
  onError: (stepName: string, error: unknown) => void = (stepName, error) => {
    console.warn(`ICP handoff: ${stepName} failed (non-fatal)`, error);
  },
) {
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      onError(step.name, error);
    }
  }
}

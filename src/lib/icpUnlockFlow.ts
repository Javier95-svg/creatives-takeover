// Full draft shown as a lead magnet — guests see all 4 sections with no blur.
// The sign-up CTA (share / save) drives account creation downstream.
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

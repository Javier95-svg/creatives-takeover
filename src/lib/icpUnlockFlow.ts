// Every section the folio may render for a guest. This is the *candidate* list,
// not the readable one: IcpGuestResultView passes GUEST_LOCKED_SECTIONS
// alongside it, and the folio blurs the intersection of the two.
//
// Read that carefully before changing either list. On 2026-08-01 (c9d02ada) the
// draft was fully ungated and this comment said guests saw the whole brief with
// no blur, truncation or lock. That stopped being true on 2026-08-18 (1fa06101,
// "gate the payoff"), which deliberately put build and moat back behind the
// gate on the grounds that a fully readable draft meant an account bought the
// reader nothing they could see. The comment here was not updated, so for the
// last five days this file has asserted the opposite of the shipped behavior.
//
// The history is worth keeping because both regimes are still being compared:
//   - to 2026-08-01, half-gate (customer + pain only): 16 saw the gate,
//     5 clicked through, 12 abandoned on it across 75 events.
//   - 2026-08-01 to 08-18, ungated: no useful data. Zero guests reached an
//     output at all in those seventeen days, so nothing about the gate can be
//     concluded from that window.
//   - from 2026-08-18, build + moat gated: 7 reached an output, 7 saw the gate,
//     1 clicked through, 0 drafts saved.
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

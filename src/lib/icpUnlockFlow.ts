export const ICP_GUEST_VISIBLE_SECTIONS = ["customer", "pain"] as const;

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

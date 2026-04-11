import type { IcpInputSchema } from "@/lib/icpBuilderSchema";

export const ICP_BUILDER_SESSION_KEY = "ct_icp_builder_session_v2";

export type IcpConfidenceLevel = "high" | "medium" | "low";

export interface IcpDraftSection {
  title: string;
  summary: string;
  bullets: string[];
}

export interface IcpDraftDocument {
  who: IcpDraftSection;
  painPoint: IcpDraftSection & {
    severity: string;
    frequency: string;
  };
  buildRecommendation: IcpDraftSection;
  moat: IcpDraftSection & {
    weakClaims: string[];
  };
  confidence: {
    level: IcpConfidenceLevel;
    summary: string;
    missingSignals: string[];
  };
  nextActions: Array<{
    title: string;
    description: string;
    route: string;
  }>;
}

export interface IcpClarificationExchange {
  question: string;
  answer: string;
}

export interface IcpDashboardTask {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  route: string;
}

export interface IcpDashboardRecommendation {
  title: string;
  description: string;
  reason: string;
  actionUrl: string;
  priority: number;
  type: "action" | "resource" | "mentor";
}

export interface IcpDashboardContext {
  message: string;
  suggestedStage: "IDENTITY";
  prioritizedTasks: IcpDashboardTask[];
  recommendations: IcpDashboardRecommendation[];
}

export interface StoredIcpArtifact {
  version: 2;
  generatedAt: string;
  founderInputs: IcpInputSchema;
  clarification: IcpClarificationExchange | null;
  draftDocument: IcpDraftDocument;
  dashboardContext: IcpDashboardContext;
  enrichment: {
    contradictionFlag: boolean;
    marketSignals: string[];
    mentorDomain: string | null;
  } | null;
}

export interface IcpBuilderSession {
  version: 2;
  answers: Partial<IcpInputSchema>;
  currentStep: number;
  clarification: IcpClarificationExchange | null;
  draftPreview: StoredIcpArtifact | null;
  unlockRequired: boolean;
  savedAnalysisId: string | null;
  updatedAt: number;
}

export function buildIcpUnlockReturnPath() {
  return "/icp-builder?unlock=1";
}

export function createEmptyIcpBuilderSession(): IcpBuilderSession {
  return {
    version: 2,
    answers: {},
    currentStep: 0,
    clarification: null,
    draftPreview: null,
    unlockRequired: false,
    savedAnalysisId: null,
    updatedAt: Date.now(),
  };
}

export function readIcpBuilderSession(): IcpBuilderSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ICP_BUILDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IcpBuilderSession>;

    if (parsed.version !== 2) {
      window.localStorage.removeItem(ICP_BUILDER_SESSION_KEY);
      return null;
    }

    return {
      ...createEmptyIcpBuilderSession(),
      ...parsed,
      version: 2,
    };
  } catch (error) {
    console.error("Failed to restore ICP Builder session", error);
    return null;
  }
}

export function persistIcpBuilderSession(session: IcpBuilderSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    ICP_BUILDER_SESSION_KEY,
    JSON.stringify({
      ...session,
      updatedAt: Date.now(),
    }),
  );
}

export function clearIcpBuilderSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ICP_BUILDER_SESSION_KEY);
}

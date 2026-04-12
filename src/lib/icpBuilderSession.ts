import type {
  FastIcpInputSchema,
  GuidedIcpInputSchema,
  IcpMarketContextValue,
  IcpPersonaSuggestion,
} from "@/lib/icpBuilderSchema";

export const ICP_BUILDER_SESSION_KEY = "ct_icp_builder_session_v3";

export type IcpConfidenceLevel = "high" | "medium" | "low";
export type IcpBuilderMode = "fast" | "guided";

export type IcpFlowScreen =
  | "mode_select"
  | "fast_input"
  | "guided_seed"
  | "guided_persona"
  | "guided_specificity"
  | "guided_pain"
  | "guided_workaround"
  | "guided_solution"
  | "guided_market_context"
  | "guided_founder_edge"
  | "gate";

export interface IcpDraftCoreFeature {
  title: string;
  description: string;
}

export interface IcpDraftLinkPill {
  name: string;
  url: string | null;
}

export interface IcpDraftDocument {
  gatePreview: {
    personaName: string;
    roleLine: string;
    painLine: string;
  };
  customer: {
    personaName: string;
    roleLine: string;
    metaLine: string;
    summary: string;
    whereToFind: string[];
  };
  pain: {
    quote: string;
    rootCause: string;
    whyItHurts: string;
    triggerMoment: string;
  };
  build: {
    valueProposition: string;
    replaces: string[];
    coreFeatures: IcpDraftCoreFeature[];
    outcome: string;
  };
  moat: {
    moatType: string;
    edge: string;
    incumbentGap: string;
    startupsToStudy: IcpDraftLinkPill[];
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
  version: 3;
  generatedAt: string;
  founderInputs: {
    mode: IcpBuilderMode;
    fastDescription: FastIcpInputSchema["description"] | null;
    guided: GuidedIcpInputSchema | null;
  };
  draftDocument: IcpDraftDocument;
  dashboardContext: IcpDashboardContext;
  enrichment: {
    contradictionFlag: boolean;
    marketSignals: string[];
    mentorDomain: string | null;
  } | null;
}

export interface IcpBuilderSession {
  version: 3;
  mode: IcpBuilderMode | null;
  currentScreen: IcpFlowScreen;
  fastDescription: string;
  guided: Partial<GuidedIcpInputSchema>;
  personaSuggestion: IcpPersonaSuggestion | null;
  personaEditedSignificantly: boolean;
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
    version: 3,
    mode: null,
    currentScreen: "mode_select",
    fastDescription: "",
    guided: {},
    personaSuggestion: null,
    personaEditedSignificantly: false,
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

    if (parsed.version !== 3) {
      window.localStorage.removeItem(ICP_BUILDER_SESSION_KEY);
      return null;
    }

    return {
      ...createEmptyIcpBuilderSession(),
      ...parsed,
      version: 3,
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

export function buildEmptyGuidedAnswers(seed = ""): Partial<GuidedIcpInputSchema> {
  return {
    seed,
    persona: {
      role: "",
      industry: "",
      experience: "",
    },
    specificity: "",
    pain: "",
    workaround: "",
    solutionCompletion: "",
    marketContext: undefined as IcpMarketContextValue | undefined,
    founderEdge: "",
  };
}

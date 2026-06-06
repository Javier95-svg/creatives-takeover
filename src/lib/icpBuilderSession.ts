import type {
  FastIcpInputSchema,
  GuidedIcpInputSchema,
  IcpMarketContextValue,
  IcpPersonaSuggestion,
} from "@/lib/icpBuilderSchema";
import { getSafeLocalStorage } from "@/lib/safeStorage";

export const ICP_BUILDER_SESSION_KEY = "ct_icp_builder_session_v3";

export type IcpConfidenceLevel = "high" | "medium" | "low";
export type IcpBuilderMode = "fast" | "guided";
export type IcpArtifactVersion = 3 | 4;

export type IcpFlowScreen =
  | "mode_select"
  | "fast_input"
  | "guided_seed"
  | "guided_persona"
  | "guided_pain"
  | "guided_workaround"
  | "gate";

export interface IcpDraftCoreFeature {
  title: string;
  description: string;
}

export interface IcpDraftLinkPill {
  name: string;
  url: string | null;
}

export interface IcpDraftSectionEvidence {
  confidence: IcpConfidenceLevel;
  evidence: string;
  missingSignalPrompt: string | null;
}

export interface IcpDraftCompetitor {
  name: string;
  url: string | null;
  doesWell: string;
  gap: string;
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
    behaviors: string[];
    motivations: string[];
    whereToFind: string[];
    triggerContext: string;
    actionTrigger: string;
    evidence: IcpDraftSectionEvidence;
  };
  pain: {
    quote: string;
    rootCause: string;
    whyItHurts: string;
    triggerMoment: string;
    costOfInaction: string;
    evidence: IcpDraftSectionEvidence;
  };
  build: {
    valueProposition: string;
    replaces: string[];
    coreFeatures: IcpDraftCoreFeature[];
    outcome: string;
    evidence: IcpDraftSectionEvidence;
  };
  moat: {
    moatType: string;
    edge: string;
    edgeSource: string;
    whyHardToCopy: string;
    incumbentGap: string;
    startupsToStudy: IcpDraftLinkPill[];
    evidence: IcpDraftSectionEvidence;
  };
  competition: {
    summary: string;
    directCompetitors: IcpDraftCompetitor[];
    exploitableGap: string;
    evidence: IcpDraftSectionEvidence;
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
  sources?: IcpDraftSource[];
}

export interface IcpDraftSource {
  type: "community" | "competitor" | "market";
  title: string;
  url: string | null;
  detail: string | null;
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
  version: IcpArtifactVersion;
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
  version: 4;
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
    version: 4,
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
    const raw = getSafeLocalStorage().getItem(ICP_BUILDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IcpBuilderSession>;

    if (parsed.version !== 4) {
      getSafeLocalStorage().removeItem(ICP_BUILDER_SESSION_KEY);
      return null;
    }

    return {
      ...createEmptyIcpBuilderSession(),
      ...parsed,
      version: 4,
    };
  } catch (error) {
    console.error("Failed to restore ICP Builder session", error);
    return null;
  }
}

export function persistIcpBuilderSession(session: IcpBuilderSession) {
  if (typeof window === "undefined") return;

  try {
    getSafeLocalStorage().setItem(
      ICP_BUILDER_SESSION_KEY,
      JSON.stringify({
        ...session,
        updatedAt: Date.now(),
      }),
    );
  } catch (error) {
    console.warn("Failed to persist ICP Builder session", error);
  }
}

export function clearIcpBuilderSession() {
  if (typeof window === "undefined") return;
  try {
    getSafeLocalStorage().removeItem(ICP_BUILDER_SESSION_KEY);
  } catch (error) {
    console.warn("Failed to clear ICP Builder session", error);
  }
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

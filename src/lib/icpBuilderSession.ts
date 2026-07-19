import type {
  FastIcpInputSchema,
  GuidedIcpInputSchema,
  IcpMarketContextValue,
  IcpPersonaSuggestion,
} from "@/lib/icpBuilderSchema";
import { getSafeLocalStorage, getSafeSessionStorage } from "@/lib/safeStorage";

export const ICP_BUILDER_SESSION_KEY = "ct_icp_builder_session_v5";
export const ICP_BUILDER_LEGACY_SESSION_KEY = "ct_icp_builder_session_v3";
export const ICP_BUILDER_AUTH_HANDOFF_KEY = "ct_icp_builder_auth_handoff_v1";
export const ICP_BUILDER_SESSION_TTL_MS = 48 * 60 * 60 * 1000;

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
  decisionBrief?: {
    primarySegment: string;
    nonFitSegment: string;
    rankedPains: Array<{ rank: number; pain: string; evidence: string }>;
    buyingTrigger: string;
    currentAlternative: string;
    reachableChannels: string[];
    interviewValidationPlan: Array<{ step: number; question: string; successSignal: string }>;
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

export interface IcpBuilderSessionV5 {
  version: 5;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  ownerUserId: string | null;
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

export type IcpBuilderSession = IcpBuilderSessionV5;

interface IcpBuilderAuthHandoff {
  version: 1;
  sessionId: string;
  returnPath: string;
  expiresAt: number;
}

export function buildIcpUnlockReturnPath() {
  return "/icp-builder?unlock=1";
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `icp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createEmptyIcpBuilderSession(now = Date.now()): IcpBuilderSession {
  return {
    version: 5,
    sessionId: createSessionId(),
    createdAt: now,
    expiresAt: now + ICP_BUILDER_SESSION_TTL_MS,
    ownerUserId: null,
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
    // v3/v4 drafts lived indefinitely in shared localStorage. They cannot be
    // safely assigned to an account, so remove them instead of migrating them.
    getSafeLocalStorage().removeItem(ICP_BUILDER_LEGACY_SESSION_KEY);
    const storage = getSafeSessionStorage();
    const raw = storage.getItem(ICP_BUILDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IcpBuilderSession>;

    if (
      parsed.version !== 5 ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now() ||
      (parsed.ownerUserId !== null && typeof parsed.ownerUserId !== "string")
    ) {
      storage.removeItem(ICP_BUILDER_SESSION_KEY);
      storage.removeItem(ICP_BUILDER_AUTH_HANDOFF_KEY);
      return null;
    }

    return {
      ...createEmptyIcpBuilderSession(),
      ...parsed,
      version: 5,
    };
  } catch (error) {
    console.error("Failed to restore ICP Builder session", error);
    clearIcpBuilderSession();
    return null;
  }
}

export function persistIcpBuilderSession(session: IcpBuilderSession) {
  if (typeof window === "undefined") return;

  try {
    getSafeSessionStorage().setItem(
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
    const storage = getSafeSessionStorage();
    storage.removeItem(ICP_BUILDER_SESSION_KEY);
    storage.removeItem(ICP_BUILDER_AUTH_HANDOFF_KEY);
  } catch (error) {
    console.warn("Failed to clear ICP Builder session", error);
  }
}

export function persistIcpBuilderAuthHandoff(session: IcpBuilderSession, returnPath: string) {
  if (typeof window === "undefined" || session.expiresAt <= Date.now()) return;
  const handoff: IcpBuilderAuthHandoff = {
    version: 1,
    sessionId: session.sessionId,
    returnPath,
    expiresAt: session.expiresAt,
  };
  getSafeSessionStorage().setItem(ICP_BUILDER_AUTH_HANDOFF_KEY, JSON.stringify(handoff));
}

/**
 * Authorize a restored draft for an authenticated user. Unowned drafts may be
 * claimed only through the one-time auth handoff created at the gate.
 */
export function authorizeIcpBuilderSession(
  session: IcpBuilderSession,
  userId: string,
): IcpBuilderSession | null {
  if (session.expiresAt <= Date.now()) {
    clearIcpBuilderSession();
    return null;
  }
  if (session.ownerUserId === userId) return session;
  if (session.ownerUserId && session.ownerUserId !== userId) {
    clearIcpBuilderSession();
    return null;
  }

  const storage = getSafeSessionStorage();
  const raw = storage.getItem(ICP_BUILDER_AUTH_HANDOFF_KEY);
  if (!raw) return null;
  try {
    const handoff = JSON.parse(raw) as Partial<IcpBuilderAuthHandoff>;
    if (
      handoff.version !== 1 ||
      handoff.sessionId !== session.sessionId ||
      typeof handoff.expiresAt !== "number" ||
      handoff.expiresAt <= Date.now()
    ) {
      clearIcpBuilderSession();
      return null;
    }
    const claimed = { ...session, ownerUserId: userId, updatedAt: Date.now() };
    storage.removeItem(ICP_BUILDER_AUTH_HANDOFF_KEY);
    persistIcpBuilderSession(claimed);
    return claimed;
  } catch {
    clearIcpBuilderSession();
    return null;
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

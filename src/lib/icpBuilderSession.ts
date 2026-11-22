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
export type IcpArtifactVersion = 3 | 4 | 5;
export type IcpEvidenceProvenance = "external_source" | "founder_input" | "model_inference";

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
  provenance?: IcpEvidenceProvenance;
  sourceIds?: string[];
}

export interface IcpDraftCompetitor {
  name: string;
  url: string | null;
  doesWell: string;
  gap: string;
}

/**
 * Whether the generator got this field from the model or backfilled it.
 *
 * Optional because drafts generated before this existed do not carry it;
 * readers go through `fieldIsReal` in icpFieldProvenance.ts, which falls back
 * to matching the historical backfill strings.
 */
export type IcpFieldProvenance = "model" | "fallback";

export type IcpViabilityDimensionKey =
  | "painSeverity"
  | "willingnessToPay"
  | "competitiveIntensity"
  | "reachability"
  | "founderEdge";

export interface IcpViabilityDimension {
  /** 0 - 100. Low is a legitimate answer, not a failure to assess. */
  score: number;
  rationale: string;
  basis: "evidence" | "inference";
  sourceIds: string[];
}

export type IcpViabilityAssessment = Record<IcpViabilityDimensionKey, IcpViabilityDimension>;

/** Relief: fix, protect, save. Desire: identity, pleasure, belonging, growth. */
export type IcpValueForm = "fix" | "protect" | "save" | "identity" | "pleasure" | "belonging" | "growth";

export interface IcpDraftAlternative {
  option: string;
  kind: "competitor" | "diy" | "do_nothing" | "other";
  /** How easy that option is for this customer, not how good it is. */
  ease: "easy" | "some_effort" | "hard";
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
    /** What changes for the customer. Absent on drafts generated before 2026-11-21. */
    whatTheyGet?: string;
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
  /**
   * The five links the older document never carried. Optional because drafts
   * generated before the chain existed are still readable and still shared;
   * every consumer must degrade rather than crash on an archived draft.
   */
  market?: {
    category: string;
    whoBuysToday: string;
    demandSignal: string;
    whyNow: string;
    /** Only present when retrieved evidence supported it. */
    shifts?: { becomingPlentiful: string[]; becomingScarce: string[] };
    evidence: IcpDraftSectionEvidence;
  };
  /** The kind of value on offer. Absent on older drafts and when the model did not commit. */
  valueForm?: { primary: IcpValueForm; secondary: IcpValueForm | null };
  /** Every other way the customer could get the same thing, with how easy each one is. */
  alternatives?: IcpDraftAlternative[];
  pricing?: {
    model: string;
    hypothesis: string;
    anchor: string;
    budgetOwner: string;
    evidence: IcpDraftSectionEvidence;
  };
  risks?: IcpDraftRisk[];
  experiment?: {
    title: string;
    hypothesis: string;
    method: string;
    sampleSize: string;
    passSignal: string;
    failSignal: string;
    timeboxDays: number;
  };
  recommendation?: {
    headline: string;
    reasoning: string;
    nextMove: string;
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
  /**
   * "unavailable" means no retrieval source was reachable, which is a fact
   * about our configuration rather than a signal about the founder's market.
   * Absent on drafts generated before retrieval existed.
   */
  evidenceRetrieval?: "ok" | "unavailable";
  viabilityAssessment?: IcpViabilityAssessment;
  /** Dotted field path to whether the model answered it. */
  fieldProvenance?: Record<string, IcpFieldProvenance>;
}

export type IcpRiskType =
  | "demand"
  | "willingness_to_pay"
  | "competition"
  | "channel"
  | "execution";

export interface IcpDraftRisk {
  rank: number;
  type: IcpRiskType;
  risk: string;
  disprovedBy: string;
}

export interface IcpDraftSource {
  sourceId?: string;
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
  userEmail?: string | null,
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
  if (!raw) {
    // React StrictMode can replay the hydration effect with the pre-claim
    // session after the first pass has already consumed the one-time handoff.
    // Accept only the exact persisted session that the first pass just claimed;
    // this keeps the handoff one-time without resetting a valid draft.
    const claimed = readIcpBuilderSession();
    if (claimed?.sessionId === session.sessionId && claimed.ownerUserId === userId) return claimed;
    // An email sign-up moved the claim to the browser (see below). This tab
    // may still be the one to use it, if it signs in first.
    return takeIcpBuilderEmailHandoff(userId, userEmail ?? null, session.sessionId);
  }
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
    // Claimed here (Google, or password sign-in in this tab): an email
    // handoff left from an earlier attempt must not save the draft again.
    clearIcpBuilderEmailHandoff(session.sessionId);
    return claimed;
  } catch {
    clearIcpBuilderSession();
    return null;
  }
}

/*
 * Email sign-up with "Confirm email" on (2026-11-22).
 *
 * The confirmation link opens a new tab, and a new tab cannot read this tab's
 * session storage, so the draft used to be lost there. When sign-up is waiting
 * for that link, the draft and its one-time claim move to the browser's local
 * storage, tied to the address the link proves. Whichever tab signs in first
 * with that address takes it, once; it expires within a day either way. A
 * different account on a shared browser cannot take it.
 *
 * A short-lived claim marker lets the other tab follow along instead of
 * saving the same draft twice: it waits for the saved draft's id and opens it.
 */
export const ICP_BUILDER_EMAIL_HANDOFF_KEY = "ct_icp_builder_email_handoff_v1";
export const ICP_BUILDER_CLAIM_KEY = "ct_icp_builder_claim_v1";
const ICP_BUILDER_EMAIL_HANDOFF_TTL_MS = 24 * 60 * 60 * 1000;
const ICP_BUILDER_CLAIM_TTL_MS = 10 * 60 * 1000;

interface IcpBuilderEmailHandoff {
  version: 1;
  email: string;
  session: IcpBuilderSession;
  expiresAt: number;
}

export interface IcpBuilderClaimMarker {
  version: 1;
  sessionId: string;
  userId: string;
  analysisId: string | null;
  at: number;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function persistIcpBuilderEmailHandoff(session: IcpBuilderSession, email: string) {
  if (typeof window === "undefined" || !email.trim() || !session.draftPreview) return;
  const now = Date.now();
  if (session.expiresAt <= now) return;
  const handoff: IcpBuilderEmailHandoff = {
    version: 1,
    email: normalizeEmail(email),
    session: { ...session, ownerUserId: null },
    expiresAt: Math.min(session.expiresAt, now + ICP_BUILDER_EMAIL_HANDOFF_TTL_MS),
  };
  try {
    getSafeLocalStorage().setItem(ICP_BUILDER_EMAIL_HANDOFF_KEY, JSON.stringify(handoff));
    // One claim at a time: this tab now claims through the same entry.
    getSafeSessionStorage().removeItem(ICP_BUILDER_AUTH_HANDOFF_KEY);
  } catch (error) {
    console.warn("Failed to keep the ICP draft for email confirmation", error);
  }
}

export function clearIcpBuilderEmailHandoff(sessionId?: string) {
  if (typeof window === "undefined") return;
  try {
    const storage = getSafeLocalStorage();
    if (!sessionId) {
      storage.removeItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
      return;
    }
    const raw = storage.getItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw as string) as Partial<IcpBuilderEmailHandoff>;
    if (parsed.session?.sessionId === sessionId) storage.removeItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
  } catch {
    /* storage unavailable: the entry expires on its own */
  }
}

/**
 * Take the email handoff for a signed-in user whose address matches. Single
 * use; with `sessionId`, only that draft. The claimed draft is written to this
 * tab's session storage, so the usual save path picks it up.
 */
export function takeIcpBuilderEmailHandoff(
  userId: string,
  userEmail: string | null,
  sessionId?: string,
): IcpBuilderSession | null {
  if (typeof window === "undefined" || !userEmail) return null;
  const storage = getSafeLocalStorage();
  try {
    const raw = storage.getItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
    if (!raw) return null;
    const handoff = JSON.parse(raw as string) as Partial<IcpBuilderEmailHandoff>;
    if (
      handoff.version !== 1 ||
      typeof handoff.email !== "string" ||
      typeof handoff.expiresAt !== "number" ||
      handoff.expiresAt <= Date.now() ||
      !handoff.session ||
      handoff.session.version !== 5 ||
      typeof handoff.session.sessionId !== "string" ||
      !handoff.session.draftPreview
    ) {
      storage.removeItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
      return null;
    }
    // Another account on a shared browser leaves it for its owner.
    if (handoff.email !== normalizeEmail(userEmail)) return null;
    if (sessionId && handoff.session.sessionId !== sessionId) return null;

    storage.removeItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
    const claimed: IcpBuilderSession = {
      ...createEmptyIcpBuilderSession(),
      ...handoff.session,
      version: 5,
      ownerUserId: userId,
      updatedAt: Date.now(),
    };
    persistIcpBuilderSession(claimed);
    recordIcpBuilderClaim({ sessionId: claimed.sessionId, userId, analysisId: null });
    return claimed;
  } catch {
    storage.removeItem(ICP_BUILDER_EMAIL_HANDOFF_KEY);
    return null;
  }
}

export function recordIcpBuilderClaim(marker: Omit<IcpBuilderClaimMarker, "version" | "at">) {
  if (typeof window === "undefined") return;
  try {
    getSafeLocalStorage().setItem(
      ICP_BUILDER_CLAIM_KEY,
      JSON.stringify({ version: 1, ...marker, at: Date.now() } satisfies IcpBuilderClaimMarker),
    );
  } catch {
    /* storage unavailable: the other tab falls back to the builder */
  }
}

/** Add the saved draft's id to this session's claim marker, if it has one. */
export function recordIcpBuilderClaimSaved(sessionId: string, userId: string, analysisId: string) {
  const marker = readIcpBuilderClaim(userId);
  if (marker?.sessionId !== sessionId) return;
  recordIcpBuilderClaim({ sessionId, userId, analysisId });
}

export function readIcpBuilderClaim(userId: string): IcpBuilderClaimMarker | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getSafeLocalStorage().getItem(ICP_BUILDER_CLAIM_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw as string) as Partial<IcpBuilderClaimMarker>;
    if (
      marker.version !== 1 ||
      marker.userId !== userId ||
      typeof marker.sessionId !== "string" ||
      typeof marker.at !== "number" ||
      Date.now() - marker.at > ICP_BUILDER_CLAIM_TTL_MS
    ) {
      return null;
    }
    return {
      version: 1,
      sessionId: marker.sessionId,
      userId,
      analysisId: typeof marker.analysisId === "string" ? marker.analysisId : null,
      at: marker.at,
    };
  } catch {
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

import { captureEvent } from "@/lib/analytics";
import { getActivationSessionId, readCTAAttribution } from "@/lib/activationEntry";
import { supabase } from "@/integrations/supabase/client";
import type { OutcomeEvaluation, VerificationMode } from "@/lib/outcomeContracts";
import { recordArtifactStageEvidence } from "@/lib/stageIntelligence";

export type JourneyTool =
  | "icp_builder"
  | "demo_studio"
  | "pmf_lab"
  | "mvp_builder"
  | "gtm_strategist"
  | "traction_engine";

export type JourneyStage =
  | "identity"
  | "prototype"
  | "validation"
  | "building"
  | "launch"
  | "traction";

export type JourneyOutcomeStatus = "draft" | "ready" | "verified" | "reviewed";

export type JourneyEvent =
  | "journey_aha_started"
  | "journey_aha_output_generated"
  | "journey_account_created_from_output"
  | "journey_artifact_restored"
  | "journey_stage_outcome_completed"
  | "journey_next_stage_started"
  | "journey_expert_review_requested"
  | "journey_expert_review_responded";

export interface JourneyEvidenceSource {
  sourceId: string;
  sourceType: string;
  version: string;
  capturedAt: string;
  confidence: number | null;
  provenance: string;
  label?: string;
  url?: string | null;
  artifactType?: string;
  artifactId?: string;
  independenceFingerprint?: string;
  verificationMode?: VerificationMode;
}

export interface JourneyEvidenceManifest {
  version: 1 | 2;
  generatedAt: string;
  sources: JourneyEvidenceSource[];
}

export interface JourneyOutcomeInput {
  userId: string;
  tool: JourneyTool;
  stage?: JourneyStage;
  artifactType: string;
  artifactId: string;
  status: JourneyOutcomeStatus;
  qualityChecks?: Record<string, boolean | number | string | null>;
  evidenceManifest?: JourneyEvidenceManifest;
  completionScore?: number | null;
  verificationMode?: VerificationMode;
  validationContextId?: string | null;
  handoffId?: string | null;
  artifactVersion?: string | null;
}

export interface JourneyHandoff {
  id: string;
  source_outcome_id: string;
  source_version_id: string;
  destination_tool: JourneyTool;
  payload: Record<string, unknown>;
  status: "pending" | "consumed" | "failed";
  consumed_artifact_id: string | null;
}

export interface PrebuildJourneyHandoffPayload extends Record<string, unknown> {
  validationContextId: string;
  icpAnalysisId: string | null;
  demoProjectId: string | null;
  demoId: string | null;
  surveyId: string | null;
  sourceArtifactId: string;
  sourceArtifactVersion?: string;
  destinationRoute: string;
}

export interface JourneyAssumption {
  id: string;
  fingerprint: string;
  statement: string;
  status: "untested" | "confirmed" | "rejected";
  current_version: number;
  source_artifact_id: string;
}

export interface JourneyEventProperties {
  tool: JourneyTool;
  stage?: JourneyStage;
  artifact_type?: string;
  artifact_id?: string;
  outcome_status?: JourneyOutcomeStatus;
  anonymous_session_id?: string;
  duration_ms?: number;
  source?: string;
  success?: boolean;
  [key: string]: unknown;
}

export const JOURNEY_TOOL_STAGES: Record<JourneyTool, JourneyStage> = {
  icp_builder: "identity",
  demo_studio: "prototype",
  pmf_lab: "validation",
  mvp_builder: "building",
  gtm_strategist: "launch",
  traction_engine: "traction",
};

export const JOURNEY_OUTCOME_CONTRACTS: Record<JourneyTool, { promise: string; artifactType: string }> = {
  icp_builder: {
    promise: "Decide exactly whom to serve first.",
    artifactType: "customer_decision_brief",
  },
  demo_studio: {
    promise: "Publish proof people can experience before the full product exists.",
    artifactType: "interactive_proof_page",
  },
  pmf_lab: {
    promise: "Make a defensible Build, Narrow, Pivot, or Stop decision.",
    artifactType: "pmf_decision_report",
  },
  mvp_builder: {
    promise: "Deploy the smallest product justified by customer evidence.",
    artifactType: "evidence_backed_mvp",
  },
  gtm_strategist: {
    promise: "Begin a measurable acquisition play instead of receiving a static plan.",
    artifactType: "gtm_acquisition_play",
  },
  traction_engine: {
    promise: "Decide what to double down on, iterate, or kill.",
    artifactType: "verified_traction_ledger",
  },
};

export function createJourneyEvidenceManifest(
  sources: JourneyEvidenceSource[],
  generatedAt = new Date().toISOString(),
): JourneyEvidenceManifest {
  const uniqueSources = Array.from(
    new Map(sources.filter((source) => source.sourceId.trim()).map((source) => [source.sourceId, source])).values(),
  );

  return {
    version: 2,
    generatedAt,
    sources: uniqueSources,
  };
}

export function trackJourneyEvent(event: JourneyEvent, properties: JourneyEventProperties) {
  const activationFlowId = typeof properties.activation_flow_id === "string"
    ? properties.activation_flow_id
    : properties.anonymous_session_id ?? getActivationSessionId();
  captureEvent(event, {
    ...properties,
    stage: properties.stage ?? JOURNEY_TOOL_STAGES[properties.tool],
    anonymous_session_id: properties.anonymous_session_id ?? activationFlowId,
    origin_entry_id: properties.origin_entry_id ?? readCTAAttribution()?.ctaId ?? properties.source ?? "direct",
    activation_flow_id: activationFlowId,
  });
}

export function trackPrebuildLineageEvent(
  event: 'prebuild_handoff_offered' | 'prebuild_handoff_opened' | 'prebuild_handoff_consumed' | 'prebuild_handoff_abandoned' | 'prebuild_evidence_collected' | 'prebuild_decision_reached',
  properties: { validationContextId: string; handoffId?: string | null; sourceTool?: JourneyTool; destinationTool?: JourneyTool; artifactId?: string | null; evidenceType?: string; decision?: string; outcomeStatus?: JourneyOutcomeStatus; weightedSignalCount?: number; elapsedMs?: number },
) {
  captureEvent(event, {
    validation_context_id: properties.validationContextId,
    handoff_id: properties.handoffId ?? undefined,
    source_tool: properties.sourceTool,
    destination_tool: properties.destinationTool,
    artifact_id: properties.artifactId ?? undefined,
    evidence_type: properties.evidenceType,
    decision: properties.decision,
    outcome_status: properties.outcomeStatus,
    weighted_signal_count: properties.weightedSignalCount,
    elapsed_ms: properties.elapsedMs,
  });
}

export async function upsertJourneyOutcome(input: JourneyOutcomeInput) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: {
      action: "evaluate",
      input: {
        tool: input.tool,
        artifactType: input.artifactType,
        artifactId: input.artifactId,
        qualityChecks: input.qualityChecks ?? {},
        evidenceManifest: input.evidenceManifest ?? createJourneyEvidenceManifest([]),
        verificationMode: input.verificationMode ?? "unverified",
        validationContextId: input.validationContextId ?? null,
        handoffId: input.handoffId ?? null,
        artifactVersion: input.artifactVersion ?? null,
      },
    },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not evaluate journey outcome.");
  if (data.evaluation?.status === "ready" || data.evaluation?.status === "verified") {
    try {
      await recordArtifactStageEvidence({
        userId: input.userId,
        artifactType: input.artifactType,
        artifactId: input.artifactId,
      });
    } catch (stageError) {
      // Outcome persistence stays authoritative if enrichment is unavailable.
      console.warn("Could not refresh founder stage evidence:", stageError);
    }
  }
  return data as { outcome: unknown; evaluation: OutcomeEvaluation; restoredHandoffs?: JourneyHandoff[] };
}

export async function createJourneyHandoff(input: {
  sourceOutcomeId: string;
  destinationTool: JourneyTool;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "create_handoff", ...input },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not create the journey handoff.");
  return data.handoff as JourneyHandoff;
}

export async function consumeJourneyHandoff(handoffId: string, artifactId: string) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "consume_handoff", handoffId, artifactId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not complete the journey handoff.");
  return data.handoff as JourneyHandoff;
}

export async function findJourneyHandoff(destinationTool: JourneyTool, sourceArtifactId: string) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "find_handoff", destinationTool, sourceArtifactId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not load the journey handoff.");
  return (data.handoff ?? null) as JourneyHandoff | null;
}

export async function registerJourneyAssumptions(sourceArtifactId: string, statements: string[]) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "register_assumptions", sourceArtifactId, statements },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not register ICP assumptions.");
  return data.assumptions as JourneyAssumption[];
}

export async function listJourneyAssumptions(sourceArtifactId?: string) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "list_assumptions", sourceArtifactId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not load ICP assumptions.");
  return data.assumptions as JourneyAssumption[];
}

export async function recordJourneyAssumptionSignal(input: {
  assumptionFingerprint: string;
  sourceTool: Exclude<JourneyTool, "icp_builder">;
  sourceArtifactId: string;
  participantFingerprint: string;
  status: "confirmed" | "rejected";
  rationale?: string;
  verificationMode?: Exclude<VerificationMode, "unverified">;
}) {
  const { data, error } = await supabase.functions.invoke("journey-outcome-service", {
    body: { action: "record_assumption_signal", ...input },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not record the assumption signal.");
  return data as {
    assumption: JourneyAssumption;
    signalSummary: { confirmations: number; rejections: number };
  };
}

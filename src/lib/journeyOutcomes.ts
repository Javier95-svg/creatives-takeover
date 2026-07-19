import { captureEvent } from "@/lib/analytics";
import { getActivationSessionId } from "@/lib/activationEntry";
import { supabase } from "@/integrations/supabase/client";

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
}

export interface JourneyEvidenceManifest {
  version: 1;
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
    version: 1,
    generatedAt,
    sources: uniqueSources,
  };
}

export function trackJourneyEvent(event: JourneyEvent, properties: JourneyEventProperties) {
  captureEvent(event, {
    ...properties,
    stage: properties.stage ?? JOURNEY_TOOL_STAGES[properties.tool],
    anonymous_session_id: properties.anonymous_session_id ?? getActivationSessionId(),
  });
}

export async function upsertJourneyOutcome(input: JourneyOutcomeInput) {
  const completedAt = input.status === "draft" ? null : new Date().toISOString();
  const payload = {
    user_id: input.userId,
    tool: input.tool,
    stage: input.stage ?? JOURNEY_TOOL_STAGES[input.tool],
    artifact_type: input.artifactType,
    artifact_id: input.artifactId,
    status: input.status,
    quality_checks: input.qualityChecks ?? {},
    evidence_manifest: input.evidenceManifest ?? createJourneyEvidenceManifest([]),
    completion_score: input.completionScore ?? null,
    completed_at: completedAt,
    verified_at: input.status === "verified" || input.status === "reviewed" ? completedAt : null,
    reviewed_at: input.status === "reviewed" ? completedAt : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("journey_outcomes" as never)
    .upsert(payload as never, { onConflict: "user_id,tool,artifact_type,artifact_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown;
}

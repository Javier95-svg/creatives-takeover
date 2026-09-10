/**
 * The pending-handoff inbox for a destination tool.
 *
 * Every handoff already carries a rich payload naming the artifacts the
 * destination needs, but nothing in the app ever read it: prefill ran entirely
 * off URL params, so a founder who arrived without the param -- a bookmark, a
 * new session, a link the source tool never emitted -- landed on an empty tool
 * holding evidence the database knew about.
 *
 * This reads the inbox directly. `journey_handoffs` has an RLS policy scoping
 * SELECT to the owning user and an index on
 * (user_id, destination_tool, status, created_at DESC), so no edge function
 * and no `sourceArtifactId` are needed -- which is exactly why the existing
 * find_handoff action could not serve this: it requires the source artifact id,
 * the thing an arriving founder does not have.
 *
 * Resolution rule everywhere: `urlParam ?? payloadField`. The param stays the
 * fast path and the only one that works for anonymous and shared-link arrivals;
 * the payload is the fallback that makes the chain survive its absence.
 */

import { supabase } from "@/integrations/supabase/client";
import type { JourneyHandoff, JourneyTool } from "@/lib/journeyOutcomes";

/** Flat, defensively narrowed view of a handoff payload. */
export interface JourneyHandoffPrefill {
  validationContextId: string | null;
  icpAnalysisId: string | null;
  demoProjectId: string | null;
  demoId: string | null;
  waitlistPageId: string | null;
  sourcePmfAnalysisId: string | null;
  sourceMvpProjectId: string | null;
  planId: string | null;
  playId: string | null;
  sprintId: string | null;
  sourceArtifactId: string | null;
  sourceArtifactVersion: string | null;
  decision: string | null;
  evidenceGrade: string | null;
  destinationRoute: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Never throws: a prefill miss must degrade to "no prefill", never break the tool. */
export function readHandoffPrefill(handoff: JourneyHandoff | null | undefined): JourneyHandoffPrefill | null {
  if (!handoff) return null;
  const payload = asRecord((handoff as { payload?: unknown }).payload);
  return {
    validationContextId: asText(payload.validationContextId),
    icpAnalysisId: asText(payload.icpAnalysisId),
    demoProjectId: asText(payload.demoProjectId),
    demoId: asText(payload.demoId),
    waitlistPageId: asText(payload.waitlistPageId),
    sourcePmfAnalysisId: asText(payload.sourcePmfAnalysisId),
    sourceMvpProjectId: asText(payload.sourceMvpProjectId),
    planId: asText(payload.planId),
    playId: asText(payload.playId),
    sprintId: asText(payload.sprintId),
    sourceArtifactId: asText(payload.sourceArtifactId),
    sourceArtifactVersion: asText(payload.sourceArtifactVersion),
    decision: asText(payload.decision),
    evidenceGrade: asText(payload.evidenceGrade),
    destinationRoute: asText(payload.destinationRoute),
  };
}

/**
 * Pending handoffs waiting for this tool, newest first. RLS scopes rows to the
 * caller, so no user_id filter is applied here.
 */
export async function listInboundHandoffs(
  destinationTool: JourneyTool,
  limit = 5,
): Promise<JourneyHandoff[]> {
  const { data, error } = await (supabase as any)
    .from("journey_handoffs")
    .select("id,source_outcome_id,source_version_id,destination_tool,payload,status,consumed_artifact_id,created_at")
    .eq("destination_tool", destinationTool)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as JourneyHandoff[];
}

/** The single most recent pending handoff, or null. Swallows errors by design. */
export async function getInboundHandoff(destinationTool: JourneyTool): Promise<JourneyHandoff | null> {
  try {
    const rows = await listInboundHandoffs(destinationTool, 1);
    return rows[0] ?? null;
  } catch (error) {
    console.warn("Could not read the journey handoff inbox:", error);
    return null;
  }
}

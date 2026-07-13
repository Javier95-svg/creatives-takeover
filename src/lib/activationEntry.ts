import { captureEvent } from "@/lib/analytics";
import { getSafeSessionStorage } from "@/lib/safeStorage";

export type ActivationEntryId =
  | "hero_demo_try"
  | "hero_icp_builder"
  | "sticky_mobile_demo_try"
  | "hero_dashboard_preview"
  | "exit_intent_icp"
  | "navbar_join_today"
  | `pricing_${string}`
  | "demo_try"
  | "icp_draft_unlock"
  | "icp_draft_share"
  | "pitch_deck_analyzer"
  | "tech_stack"
  | "insighta_test"
  | "direct";

export type ActivationTool =
  | "demo_studio"
  | "icp_builder"
  | "pitch_deck_analyzer"
  | "tech_stack_builder"
  | "insighta_test";

export type ActivationFunnelEvent =
  | "activation_entry_opened"
  | "activation_step_completed"
  | "activation_validation_failed"
  | "activation_generation_failed"
  | "activation_gate_shown"
  | "activation_gate_clicked"
  | "activation_resume_succeeded"
  | "activation_resume_failed"
  | "activation_abandoned";

export interface ActivationFunnelProperties {
  entry_id: ActivationEntryId;
  tool: ActivationTool;
  source: string;
  step: string;
  is_authenticated: boolean;
  anonymous_session_id?: string;
  entry_page?: string;
  placement?: string;
  reason?: string;
  error_code?: string;
  return_path?: string;
  artifact_type?: string;
  [key: string]: unknown;
}

const SESSION_KEY = "ct_activation_session_id";
const CTA_STORAGE_KEY = "_cta_attr";

export interface StoredCTAAttribution {
  ctaId: string;
  page: string;
  section?: string;
  clickedAt: number;
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `activation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getActivationSessionId() {
  const storage = getSafeSessionStorage();
  const existing = storage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = randomId();
  storage.setItem(SESSION_KEY, created);
  return created;
}

export function readCTAAttribution(): StoredCTAAttribution | null {
  try {
    const parsed = JSON.parse(getSafeSessionStorage().getItem(CTA_STORAGE_KEY) ?? "null") as Partial<StoredCTAAttribution> | null;
    return parsed && typeof parsed.ctaId === "string" && typeof parsed.page === "string" && typeof parsed.clickedAt === "number"
      ? parsed as StoredCTAAttribution
      : null;
  } catch {
    return null;
  }
}

export function trackActivationFunnelEvent(
  event: ActivationFunnelEvent,
  properties: ActivationFunnelProperties,
) {
  captureEvent(event, {
    ...properties,
    anonymous_session_id: properties.anonymous_session_id ?? getActivationSessionId(),
  });
}

export function trackActivationEntry(
  event: "activation_entry_opened" | "activation_gate_clicked" | "activation_gate_shown",
  properties: ActivationFunnelProperties,
) {
  trackActivationFunnelEvent(event, properties);
}

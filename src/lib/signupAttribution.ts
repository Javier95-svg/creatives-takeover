import {
  captureEvent,
  persistAuthMethod,
  persistSignupIntent,
  trackSignupCompletedAttributed,
  type SignupMethod,
} from "@/lib/analytics";
import { persistOnboardingReturn, sanitizeReturnPath } from "@/lib/authRedirect";
import { readCTAAttribution, type ActivationEntryId } from "@/lib/activationEntry";
import { getSafeLocalStorage, getSafeSessionStorage } from "@/lib/safeStorage";
import { setOAuthAuthIntent } from "@/lib/referral";
import { readOutputSignupContext } from "@/lib/outputSignupContext";

const INTENT_KEY = "ct_signup_attribution_intent_v1";
const START_GUARD_KEY = "ct_signup_attribution_started_v1";

export interface SignupAttributionIntent {
  version: 1;
  method: SignupMethod;
  source: string;
  returnUrl: string;
  entryId: ActivationEntryId;
  entryPage: string;
  startedAt: number;
  operationId: string;
}

interface BeginSignupAttributionParams {
  method: SignupMethod;
  source: string;
  returnUrl: string;
  entryId?: ActivationEntryId;
}

function operationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `signup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function beginAttributedSignup({ method, source, returnUrl, entryId }: BeginSignupAttributionParams) {
  const safeReturn = sanitizeReturnPath(returnUrl, "/dashboard");
  const local = getSafeLocalStorage();
  const session = getSafeSessionStorage();
  try {
    const existing = JSON.parse(local.getItem(INTENT_KEY) ?? "null") as SignupAttributionIntent | null;
    if (
      existing?.version === 1 &&
      existing.method === method &&
      existing.source === source &&
      existing.returnUrl === safeReturn &&
      Date.now() - existing.startedAt <= 30 * 60 * 1000 &&
      session.getItem(START_GUARD_KEY) === existing.operationId
    ) return existing;
  } catch {
    // A malformed marker is replaced below.
  }
  const cta = readCTAAttribution();
  const outputContext = readOutputSignupContext();
  const intent: SignupAttributionIntent = {
    version: 1,
    method,
    source,
    returnUrl: safeReturn,
    entryId: entryId ?? (cta?.ctaId as ActivationEntryId | undefined) ?? "direct",
    entryPage: cta?.page ?? (typeof window !== "undefined" ? window.location.pathname : "unknown"),
    startedAt: Date.now(),
    operationId: operationId(),
  };

  local.setItem(INTENT_KEY, JSON.stringify(intent));
  if (method !== "email") {
    local.setItem("oauth_return_url", safeReturn);
    local.setItem("oauth_source", source);
    local.setItem("oauth_signup_method", method);
    setOAuthAuthIntent("signup");
  }
  session.setItem(START_GUARD_KEY, intent.operationId);
  persistOnboardingReturn(safeReturn);
  persistAuthMethod(method);
  persistSignupIntent(method);
  captureEvent("signup_started", {
    method,
    source,
    returnUrl: safeReturn,
    entry_id: intent.entryId,
    entry_page: intent.entryPage,
    operation_id: intent.operationId,
    had_output_before_signup: Boolean(outputContext),
    ...(outputContext ? {
      output_route: outputContext.outputRoute,
      anonymous_artifact_id: outputContext.anonymousArtifactId,
      time_to_signup_s: Math.max(0, Math.round((Date.now() - outputContext.outputGeneratedAt) / 1000)),
    } : {}),
  });
  captureEvent("conversion_cta_signup_started", {
    method,
    source,
    entry_id: intent.entryId,
    entry_page: intent.entryPage,
    operation_id: intent.operationId,
  });
  return intent;
}

export function beginAttributedOAuthSignup(params: BeginSignupAttributionParams) {
  return beginAttributedSignup(params);
}

export function completeAttributedSignup(): SignupAttributionIntent | null {
  const storage = getSafeLocalStorage();
  const raw = storage.getItem(INTENT_KEY);
  if (!raw) return null;
  try {
    const intent = JSON.parse(raw) as SignupAttributionIntent;
    if (intent.version !== 1 || Date.now() - intent.startedAt > 30 * 60 * 1000) return null;
    const guardKey = `ct_signup_attribution_completed_${intent.operationId}`;
    if (getSafeSessionStorage().getItem(guardKey) === "true") return intent;
    getSafeSessionStorage().setItem(guardKey, "true");
    trackSignupCompletedAttributed({
      method: intent.method,
      entry_cta: intent.entryId,
      entry_page: intent.entryPage,
      minutes_from_cta: Math.round((Date.now() - intent.startedAt) / 60000),
    });
    return intent;
  } catch {
    return null;
  } finally {
    storage.removeItem(INTENT_KEY);
  }
}

export function completeAttributedOAuthSignup() {
  return completeAttributedSignup();
}

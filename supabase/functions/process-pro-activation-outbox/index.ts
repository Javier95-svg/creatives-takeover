import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getProActivationRetryDelayMinutes } from "../_shared/pro-activation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pro-activation-worker-secret",
};

type OutboxStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

interface ProActivationOutboxRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  startup_name: string | null;
  subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_event_id: string;
  stripe_event_type: string;
  idempotency_key: string;
  status: OutboxStatus;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown> | null;
  next_attempt_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
}

function getEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseLimit(value: string | null, fallback = 25): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 100));
}

function shouldTreatAsSuccess(status: number): boolean {
  return (status >= 200 && status < 300) || status === 409 || status === 208;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function computeRetryTimestamp(attemptNumber: number): string {
  const delayMinutes = getProActivationRetryDelayMinutes(attemptNumber);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const workerSecret = getEnv("PRO_ACTIVATION_WORKER_SECRET");
    if (workerSecret) {
      const urlSecret = new URL(req.url).searchParams.get("secret");
      const headerSecret = req.headers.get("x-pro-activation-worker-secret");
      if (urlSecret !== workerSecret && headerSecret !== workerSecret) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const limit = parseLimit(
      typeof body.limit === 'number' ? String(body.limit) : (typeof body.limit === 'string' ? body.limit : null),
      parseLimit(new URL(req.url).searchParams.get('limit'), 25)
    );

    const { data: claimedRows, error: claimError } = await supabase.rpc('claim_due_pro_activation_outbox', {
      p_limit: limit,
    });

    if (claimError) {
      throw new Error(claimError.message);
    }

    const rows = (claimedRows ?? []) as ProActivationOutboxRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, claimed: 0, sent: 0, failed: 0, skipped: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = getEnv('PRO_ONBOARDING_WEBHOOK_URL');
    const webhookSecret = getEnv('PRO_ONBOARDING_WEBHOOK_SECRET');
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      const metadata = asRecord(row.payload);
      const nowIso = new Date().toISOString();

      try {
        if (!webhookUrl) {
          await supabase
            .from('pro_activation_outbox')
            .update({
              status: 'skipped',
              last_error: 'PRO_ONBOARDING_WEBHOOK_URL is not configured',
              next_attempt_at: null,
              payload: {
                ...metadata,
                terminalReason: 'missing_webhook_url',
                updatedBy: 'process-pro-activation-outbox',
                updatedAtIso: nowIso,
              },
            })
            .eq('id', row.id);
          skipped += 1;
          continue;
        }

        if (!row.email) {
          await supabase
            .from('pro_activation_outbox')
            .update({
              status: 'skipped',
              last_error: 'No email/contact context available for Pro onboarding',
              next_attempt_at: null,
              payload: {
                ...metadata,
                terminalReason: 'missing_contact_context',
                updatedBy: 'process-pro-activation-outbox',
                updatedAtIso: nowIso,
              },
            })
            .eq('id', row.id);
          skipped += 1;
          continue;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhookSecret ? { 'x-pro-onboarding-secret': webhookSecret } : {}),
          },
          body: JSON.stringify({
            eventType: 'pro_activation',
            idempotencyKey: row.idempotency_key,
            user: {
              id: row.user_id,
              email: row.email,
              fullName: row.full_name,
              startupName: row.startup_name,
            },
            stripe: {
              eventId: row.stripe_event_id,
              eventType: row.stripe_event_type,
              customerId: row.stripe_customer_id,
              subscriptionId: row.subscription_id,
            },
            outbox: {
              id: row.id,
              attempt: row.attempts,
              createdAt: row.created_at,
            },
            payload: metadata,
          }),
        });

        if (shouldTreatAsSuccess(response.status)) {
          await supabase
            .from('pro_activation_outbox')
            .update({
              status: 'sent',
              delivered_at: nowIso,
              next_attempt_at: null,
              last_error: null,
              payload: {
                ...metadata,
                deliveryStatusCode: response.status,
                deliveredAtIso: nowIso,
                updatedBy: 'process-pro-activation-outbox',
              },
            })
            .eq('id', row.id);
          sent += 1;
          continue;
        }

        const responseText = await response.text();
        const terminalFailure = !isRetryableStatus(response.status) || row.attempts >= row.max_attempts;

        await supabase
          .from('pro_activation_outbox')
          .update({
            status: 'failed',
            last_error: `HTTP ${response.status}: ${responseText}`,
            next_attempt_at: terminalFailure ? null : computeRetryTimestamp(row.attempts),
            payload: {
              ...metadata,
              deliveryStatusCode: response.status,
              terminalFailure,
              updatedBy: 'process-pro-activation-outbox',
              updatedAtIso: nowIso,
            },
          })
          .eq('id', row.id);
        failed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const terminalFailure = row.attempts >= row.max_attempts;

        await supabase
          .from('pro_activation_outbox')
          .update({
            status: 'failed',
            last_error: message,
            next_attempt_at: terminalFailure ? null : computeRetryTimestamp(row.attempts),
            payload: {
              ...metadata,
              transportError: message,
              terminalFailure,
              updatedBy: 'process-pro-activation-outbox',
              updatedAtIso: nowIso,
            },
          })
          .eq('id', row.id);
        failed += 1;
      }
    }

    return new Response(JSON.stringify({ ok: true, claimed: rows.length, sent, failed, skipped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
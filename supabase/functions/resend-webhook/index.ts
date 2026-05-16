import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-webhook-secret",
};

const getEnv = (name: string) => (Deno.env.get(name) ?? "").trim();

const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTimestamp(value: string | null): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeEvent(payload: unknown) {
  const top = asRecord(payload);
  const data = asRecord(top.data);
  const type =
    asString(top.type) ||
    asString(top.event) ||
    asString(data.type) ||
    asString(data.event);
  const resendId =
    asString(data.email_id) ||
    asString(data.emailId) ||
    asString(data.id) ||
    asString(top.email_id) ||
    asString(top.emailId) ||
    asString(top.id);
  if (!type || !resendId) return null;
  return {
    type: type.toLowerCase(),
    resendId,
    eventAt: normalizeTimestamp(
      asString(top.created_at) ||
        asString(top.createdAt) ||
        asString(data.created_at) ||
        asString(data.createdAt),
    ),
  };
}

function isOpen(type: string) {
  return type === "email.opened" || type === "opened";
}

function isClick(type: string) {
  return type === "email.clicked" || type === "clicked";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const secret = getEnv("RESEND_WEBHOOK_SECRET");
  if (secret) {
    const urlSecret = new URL(req.url).searchParams.get("secret");
    const headerSecret = req.headers.get("x-resend-webhook-secret");
    if (urlSecret !== secret && headerSecret !== secret) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  try {
    const normalized = normalizeEvent(await req.json());
    if (!normalized) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid webhook payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const patch: Record<string, string> = {};
    if (isOpen(normalized.type)) patch.opened_at = normalized.eventAt;
    if (isClick(normalized.type)) patch.clicked_at = normalized.eventAt;

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ ok: true, updated: 0, ignored: normalized.type }), {
        status: 202,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data, error } = await supabase
      .from("retention_email_log")
      .update(patch)
      .eq("resend_id", normalized.resendId)
      .select("id");

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, updated: data?.length ?? 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

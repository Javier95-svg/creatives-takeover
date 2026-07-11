import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInfo, logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const ALLOWED_EVENT_PREFIXES = [
  "activation_",
  "artifact_",
  "dashboard_",
  "discovery_call_",
  "first_",
  "mentor_",
  "message_",
  "saved_mentors_",
  "tool_",
] as const;

const SENSITIVE_KEYS = new Set([
  "email",
  "full_name",
  "name",
  "content",
  "message",
  "ip",
  "ip_address",
  "website_url",
  "user_id",
]);

function isAllowedEventType(value: unknown): value is string {
  return typeof value === "string"
    && /^[a-z0-9][a-z0-9_:-]{0,79}$/.test(value)
    && ALLOWED_EVENT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function sanitizeActivityData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => !SENSITIVE_KEYS.has(key) && item !== undefined)
      .slice(0, 30)
      .map(([key, item]) => {
        if (typeof item === "string") return [key, item.slice(0, 240)];
        if (typeof item === "number" || typeof item === "boolean" || item === null) return [key, item];
        if (Array.isArray(item)) return [key, item.slice(0, 12).filter((entry) => ["string", "number", "boolean"].includes(typeof entry))];
        return [key, undefined];
      })
      .filter(([, item]) => item !== undefined),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    logInfo("Track activity request received");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Authentication required" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid authentication" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { activity_type, activity_data, page_path, source_tool, source_entity_type, source_entity_id, event_key } = await req.json();
    const user_id = authData.user.id;

    if (!isAllowedEventType(activity_type)) {
      logError("Invalid activity type", { user_id, activity_type, function_name: "track-activity" });
      return new Response(JSON.stringify({ ok: false, error: "Unsupported activity_type" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    logInfo("Inserting activity log", { user_id, activity_type, page_path, function_name: "track-activity" });

    const { data, error } = await supabase
      .from("user_activity_log")
      .upsert({
        user_id,
        activity_type,
        activity_data: sanitizeActivityData(activity_data),
        page_path: typeof page_path === "string" ? page_path.slice(0, 240) : null,
        source_tool: typeof source_tool === "string" ? source_tool.slice(0, 80) : null,
        source_entity_type: typeof source_entity_type === "string" ? source_entity_type.slice(0, 80) : null,
        source_entity_id: typeof source_entity_id === "string" ? source_entity_id.slice(0, 120) : null,
        event_key: typeof event_key === "string" ? event_key.slice(0, 180) : null,
      }, {
        onConflict: "user_id,event_key",
        ignoreDuplicates: Boolean(event_key),
      })
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    logInfo("Activity tracked successfully", { activity_id: data?.id, function_name: "track-activity" });

    return new Response(JSON.stringify({ ok: true, result: { success: true, activity: data } }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    logError("edge_function_error", {
      function_name: "track-activity",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

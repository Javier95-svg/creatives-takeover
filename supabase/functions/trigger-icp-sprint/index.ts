import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TriggerPayload = {
  userId?: string;
  email?: string;
  fullName?: string | null;
  icpId?: string | null;
  niche?: string | null;
};

const SPRINT_SEQUENCE = [
  { sequence: "activation_day0", offsetDays: 0 },
  { sequence: "activation_day2", offsetDays: 2 },
  { sequence: "activation_day7", offsetDays: 7 },
] as const;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dateAfterDays(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing environment config" }, 500);
    }

    const payload = (await req.json()) as TriggerPayload;
    const userId = cleanString(payload.userId);
    const email = cleanString(payload.email);

    if (!userId || !email) {
      return jsonResponse({ error: "Missing required fields: userId, email" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rows = SPRINT_SEQUENCE.map(({ sequence, offsetDays }) => ({
      user_id: userId,
      email,
      full_name: cleanString(payload.fullName),
      niche: cleanString(payload.niche),
      sequence,
      activation_intent: "run_icp",
      due_date: dateAfterDays(offsetDays),
      icp_id: cleanString(payload.icpId),
    }));

    const { error } = await supabase
      .from("icp_sprint_schedule")
      .upsert(rows, {
        onConflict: "user_id,sequence",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("trigger-icp-sprint: schedule insert failed", error);
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ ok: true, scheduled: rows.length });
  } catch (error) {
    console.error("trigger-icp-sprint: error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

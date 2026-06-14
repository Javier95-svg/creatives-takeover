import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SprintScheduleRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  niche: string | null;
  sequence: string;
  activation_intent: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = (Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing environment config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);
  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const { data: rows, error: fetchError } = await supabase
      .from("icp_sprint_schedule")
      .select("id, user_id, email, full_name, niche, sequence, activation_intent")
      .eq("sent", false)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    for (const row of (rows ?? []) as SprintScheduleRow[]) {
      results.processed++;

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: row.user_id,
            email: row.email,
            fullName: row.full_name,
            niche: row.niche,
            sequence: row.sequence,
            activationIntent: row.activation_intent,
            ctaUrl: `${appUrl}/icp-builder`,
            ctaLabel: "Continue your ICP sprint",
          }),
        });

        const json = await response.json().catch(() => null) as { ok?: boolean; skipped?: boolean } | null;
        if (!response.ok || (!json?.ok && !json?.skipped)) {
          throw new Error(`send-retention-email failed: ${JSON.stringify(json)}`);
        }

        const { error: updateError } = await supabase
          .from("icp_sprint_schedule")
          .update({
            sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          throw updateError;
        }

        if (json.skipped) {
          results.skipped++;
        } else {
          results.sent++;
        }
      } catch (error) {
        results.errors++;
        console.error("process-icp-sprint-emails: row failed", row.id, error);
      }
    }

    return jsonResponse({ ok: true, ...results });
  } catch (error) {
    console.error("process-icp-sprint-emails: error", error);
    return jsonResponse(
      {
        ok: false,
        ...results,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

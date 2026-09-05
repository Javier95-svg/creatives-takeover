import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);
const headers = { "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

// The sender owns fresh eligibility, copy, and atomic claims for every candidate.
serve(async (req: Request) => {
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return respond({ error: "Forbidden" }, 403);
  try {
    const { data: settings, error } = await supabase.from("retention_roadmap_settings").select("enabled").eq("singleton", true).single();
    if (error) throw error;
    if (!settings.enabled) return respond({ ok: true, skipped: true, reason: "campaign_disabled" });
    const results = { processed: 0, sent: 0, skipped: 0, failures: [] as { user_id: string; reason: string }[] };
    for (let offset = 0; ; offset += 200) {
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id").order("id").range(offset, offset + 199);
      if (profileError) throw profileError;
      for (const profile of profiles ?? []) {
        results.processed++;
        try {
          const auth = await supabase.auth.admin.getUserById(profile.id);
          if (auth.error) throw auth.error;
          const email = auth.data.user?.email;
          if (!email || email.toLowerCase() === "admin@creatives-takeover.com") { results.skipped++; continue; }
          const response = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ userId: profile.id, email, sequence: "activation_nudge" }),
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error ?? "Retention send failed");
          if (result.skipped) results.skipped++; else results.sent++;
        } catch (error) {
          results.failures.push({ user_id: profile.id, reason: error instanceof Error ? error.message : "send_failed" });
        }
      }
      if (!profiles || profiles.length < 200) break;
    }
    return respond({ ok: true, ...results });
  } catch (error) {
    return respond({ ok: false, error: error instanceof Error ? error.message : "worker_failed" }, 500);
  }
});

/**
 * Public opt-out from customer research (/research-opt-out).
 *
 * A company asks not to appear in research results: its domain joins the
 * global suppression list (every future run skips it), its cached pages are
 * deleted, and any named contacts found at that domain are removed. The team
 * gets an email for its records. No sign-in; the form is the only input.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendAdminEmail } from "../_shared/admin-alert.ts";
import { normalizeDomain } from "../../../src/lib/gtmResearch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;
const MAX_REQUESTS_PER_HOUR = 60;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  // Hidden field people never fill; bots usually do. Answer as if it worked.
  if (typeof body.company_fax === "string" && body.company_fax.trim()) return json({ ok: true });

  const domain = normalizeDomain(typeof body.website === "string" ? body.website.slice(0, 300) : "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!domain) return json({ error: "Enter your company's website, for example yourcompany.com." }, 400);
  if (!EMAIL.test(email)) return json({ error: "Enter an email address so we can confirm the removal." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("gtm_suppressions").select("id", { count: "exact", head: true }).eq("source", "optout_form").gte("created_at", since);
  if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) return json({ error: "Too many requests right now. Email admin@creatives-takeover.com instead." }, 429);

  const { error } = await db.from("gtm_suppressions").insert({ domain, email: null, reason: reason || "Opt-out form", requester_email: email, source: "optout_form" });
  if (error && error.code !== "23505") {
    console.error("gtm-research-optout insert failed", error.message);
    return json({ error: "We couldn't save that. Email admin@creatives-takeover.com and we'll do it by hand." }, 500);
  }
  await Promise.all([
    db.from("gtm_domain_cache").delete().eq("domain", domain),
    db.from("gtm_prospect_contacts").delete().ilike("email", `%@${domain}`),
  ]);
  await sendAdminEmail(`Research opt-out: ${domain}`, [
    `${domain} asked to be left out of customer research. It is now on the suppression list, its cached pages are deleted and named contacts at that domain are removed.`,
    `Requested by: ${email}`,
    reason ? `Reason: ${reason}` : "No reason given.",
    "Reply to the requester to confirm.",
  ]).catch((alertError) => console.error("gtm-research-optout alert failed", alertError));
  return json({ ok: true });
});

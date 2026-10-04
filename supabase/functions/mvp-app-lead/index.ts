import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isBotSubmission, toLeadRow } from "../_shared/mvp-lead.ts";

// Form submissions from published MVP Builder apps. Called by the lead script
// that api/published-site.ts injects next to the visit beacon. Anonymous
// (verify_jwt=false): visitors have no Supabase session. Abuse is bounded by a
// per-IP rate limit and size caps; only published apps accept leads.
//
// { check: true } validates the app and the payload without storing anything,
// for MVP Builder's check before publishing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const RATE_LIMIT_PER_MIN = 10;

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.toLowerCase().trim() : "";
    const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
    if (!SLUG_PATTERN.test(slug) && !projectId) return json({ ok: false, error: "Unknown app." }, 422);

    if (isBotSubmission(body?.fields)) return json({ ok: true });
    const lead = toLeadRow(body?.fields);
    if (!lead) return json({ ok: false, error: "The form was empty." }, 422);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { error: rlError } = await admin.rpc("assert_rate_limit", {
      p_key: `mvp_app_lead:${clientIp(req)}`,
      p_user_id: null,
      p_max_per_minute: RATE_LIMIT_PER_MIN,
    });
    if (rlError && /rate_limit_exceeded/i.test(rlError.message || "")) {
      return json({ ok: false, error: "Too many submissions. Try again in a minute." }, 429);
    }

    // The builder's pre-publish check runs before the app has a public slug.
    let query = admin.from("mvp_projects").select("id, user_id, subdomain_slug, deployment_url");
    query = projectId ? query.eq("id", projectId) : query.eq("subdomain_slug", slug);
    const { data: project } = await query.maybeSingle();
    if (!project) return json({ ok: false, error: "Unknown app." }, 404);

    if (body?.check === true) return json({ ok: true, check: true, saved: false, email: Boolean(lead.email) });
    if (!project.subdomain_slug && !project.deployment_url) return json({ ok: false, error: "This app is not published." }, 404);

    const { error } = await admin.from("mvp_app_leads").insert({
      project_id: project.id,
      user_id: project.user_id,
      email: lead.email,
      name: lead.name,
      message: lead.message,
      fields: lead.fields,
      page_path: typeof body?.path === "string" ? body.path.slice(0, 300) : null,
      visitor_id: typeof body?.visitorId === "string" ? body.visitorId.slice(0, 64) : null,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error("mvp-app-lead error:", error);
    return json({ ok: false, error: "Could not save. Please try again." }, 500);
  }
});

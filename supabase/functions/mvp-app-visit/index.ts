import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Visit beacon for published MVP Builder sites ({slug}.creatives-takeover.com).
// Called by the analytics snippet injected in api/published-site.ts. Anonymous
// (verify_jwt=false): visitors have no Supabase session. Writes are deduped at
// one row per (project, visitor, day) by a unique constraint, which also bounds
// abuse — replaying the same beacon cannot inflate counts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const MAX_VISITOR_ID = 64;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.toLowerCase().trim() : "";
    const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim().slice(0, MAX_VISITOR_ID) : "";

    if (!SLUG_PATTERN.test(slug) || visitorId.length < 8) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing configuration");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: project } = await supabase
      .from("mvp_projects")
      .select("id, user_id")
      .eq("subdomain_slug", slug)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduped per (project, visitor, day); conflicts are the common case and fine.
    await supabase
      .from("mvp_app_visits")
      .upsert(
        {
          project_id: project.id,
          user_id: project.user_id,
          visitor_id: visitorId,
        },
        { onConflict: "project_id,visitor_id,visit_date", ignoreDuplicates: true },
      );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mvp-app-visit error:", error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

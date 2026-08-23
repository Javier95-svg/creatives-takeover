import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const countable = new Set(["demo_view", "demo_start", "demo_complete", "cta_click"]);
const ancillary = new Set(["launch_page_view", "vsl_impression", "vsl_play", "vsl_complete", "signup_attempt", "signup", "waitlist_signup"]);
const allowed = new Set([...countable, ...ancillary, "demo_step"]);
const reactions = new Set(["interested", "not_for_me", "book_call", "commitment"]);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const demoId = typeof body.demoId === "string" ? body.demoId : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const type = typeof body.type === "string" ? body.type : "";
    const response = typeof body.response === "string" ? body.response : "";
    if ((!demoId && !projectId) || (!allowed.has(type) && !reactions.has(response))) return json({ error: "Invalid signal" }, 400);
    if ((countable.has(type) || type === "demo_step" || reactions.has(response)) && !demoId) return json({ error: "demoId is required" }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Signal collection unavailable" }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const viewerHash = await hash(`${demoId || projectId}:${ip}:${req.headers.get("user-agent") || "unknown"}`);
    const { error: rateError } = await admin.rpc("assert_rate_limit", {
      p_key: `demo_event:${viewerHash}`, p_user_id: null, p_max_per_minute: 30,
    });
    if (rateError && /rate_limit_exceeded/i.test(rateError.message || "")) return json({ error: "Too many events" }, 429);

    const { data: demo, error: demoError } = demoId
      ? await admin.from("demo_studio_demos")
        .select("id,project_id,status,demo_studio_projects!inner(id,validation_context_id,owner_id)")
        .eq("id", demoId).maybeSingle()
      : { data: null, error: null };
    if (demoError) throw demoError;
    if (demoId && (!demo || demo.status !== "published")) return json({ error: "Published demo not found" }, 404);
    const joinedProject = demo ? (Array.isArray(demo.demo_studio_projects) ? demo.demo_studio_projects[0] : demo.demo_studio_projects) : null;
    const { data: publicProject } = !demo && projectId
      ? await admin.from("demo_studio_projects").select("id,validation_context_id,launch_published,owner_id").eq("id", projectId).maybeSingle()
      : { data: null };
    const project = joinedProject ?? publicProject;
    if (!demo && (!publicProject || publicProject.launch_published !== true)) return json({ error: "Published project not found" }, 404);

    /*
     * A founder checking their own published demo is not market evidence.
     *
     * The row is still written, marked rather than dropped: preview traffic is
     * how a founder confirms the thing works, and silently discarding it would
     * make this function impossible to debug from the data it produces. The
     * evidence triggers and the proof-loop funnel filter on owner_view instead.
     *
     * Resolved from the token, never from a field in the body. This endpoint is
     * verify_jwt = false so strangers can reach it, and a browser still sends an
     * Authorization header carrying the anon key, which getUserFromAuth correctly
     * reads as nobody. A self-reported "this is only me" flag would be useless:
     * the founder whose numbers this protects is the one party with a reason to
     * omit it.
     */
    const caller = await getUserFromAuth(req);
    const ownerView = Boolean(caller?.id && project?.owner_id && caller.id === project.owner_id);

    if (reactions.has(response)) {
      const { error } = await admin.from("demo_studio_responses").upsert({
        project_id: demo!.project_id,
        demo_id: demo.id,
        validation_context_id: project?.validation_context_id ?? null,
        response,
        objection: typeof body.objection === "string" ? body.objection.slice(0, 1000) : null,
        viewer_hash: viewerHash,
        verified: true,
        owner_view: ownerView,
      }, { onConflict: "demo_id,viewer_hash", ignoreDuplicates: false });
      if (error) throw error;
      return json({ ok: true, deduplicated: true });
    }

    const { error } = await admin.from("demo_studio_events").upsert({
      project_id: demo?.project_id ?? projectId,
      demo_id: demo?.id ?? null,
      vsl_id: typeof body.vslId === "string" ? body.vslId : null,
      type,
      viewer_hash: viewerHash,
      verified: true,
      owner_view: ownerView,
      meta: { source: "verified_edge", client: body.meta ?? {} },
    }, countable.has(type)
      ? { onConflict: "demo_id,type,viewer_hash", ignoreDuplicates: true }
      : { ignoreDuplicates: false });
    if (error) throw error;
    return json({ ok: true, deduplicated: countable.has(type) });
  } catch (error) {
    console.error("demo-studio-event", error);
    return json({ error: error instanceof Error ? error.message : "Signal collection failed" }, 500);
  }
});

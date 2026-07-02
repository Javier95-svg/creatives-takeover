/**
 * load-demo-try-draft
 *
 * Restores an anonymous demo-try draft from a resume-email token. Mirrors
 * load-icp-email-draft: look up by token, reject expired links, mark the row
 * converted (which stops the drip), and return the stored TryDraft artifact
 * for the client to rehydrate into /demo-studio/try.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoadDraftRequest {
  resumeToken?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as LoadDraftRequest;
    const resumeToken = payload.resumeToken?.trim();
    if (!resumeToken) {
      return new Response(JSON.stringify({ success: false, error: "resumeToken is required" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment configuration");
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await serviceClient
      .from("demo_try_guest_drafts")
      .select("artifact, expires_at")
      .eq("resume_token", resumeToken)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ success: false, error: "Demo draft not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ success: false, error: "This demo link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as converted so the drip sequence stops firing
    await serviceClient
      .from("demo_try_guest_drafts")
      .update({ converted_at: new Date().toISOString() })
      .eq("resume_token", resumeToken)
      .is("converted_at", null);

    return new Response(JSON.stringify({
      success: true,
      artifact: data.artifact,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("load-demo-try-draft failed", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

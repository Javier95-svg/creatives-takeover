import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const discoveryCallId = typeof body.discoveryCallId === "string" ? body.discoveryCallId : "";

    if (!discoveryCallId) {
      return jsonResponse({ success: false, error: "discoveryCallId is required" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabaseAdmin.functions.invoke("notify-discovery-call-event", {
      body: {
        discoveryCallId,
        eventType: "scheduled",
      },
    });

    if (error) {
      throw error;
    }

    return jsonResponse(data ?? { success: true, discoveryCallId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NOTIFY-DISCOVERY-CALL-BOOKED] Error:", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});

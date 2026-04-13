import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInfo, logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { user_id, activity_type, activity_data, page_path } = await req.json();

    if (!user_id || !activity_type) {
      logError("Missing required fields", { user_id, activity_type, function_name: "track-activity" });
      return new Response(JSON.stringify({ ok: false, error: "user_id and activity_type are required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    logInfo("Inserting activity log", { user_id, activity_type, page_path, function_name: "track-activity" });

    const { data, error } = await supabase
      .from("user_activity_log")
      .insert({
        user_id,
        activity_type,
        activity_data: activity_data || {},
        page_path: page_path || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logInfo("Activity tracked successfully", { activity_id: data.id, function_name: "track-activity" });

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

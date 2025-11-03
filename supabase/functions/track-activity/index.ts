import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { logInfo, logError, withErrorBoundary } from "../_shared/logger.ts";
import { handleOptionsRequest } from "../_shared/cors.ts";

serve(withErrorBoundary(async (req) => {
  if (req.method === "OPTIONS") {
    return handleOptionsRequest();
  }

  logInfo("Track activity request received");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { user_id, activity_type, activity_data, page_path } = await req.json();

  if (!user_id || !activity_type) {
    logError("Missing required fields", { user_id, activity_type });
    throw new Error("user_id and activity_type are required");
  }

  logInfo("Inserting activity log", { user_id, activity_type, page_path });

  const { data, error } = await supabase
    .from("user_activity_log")
    .insert({
      user_id,
      activity_type,
      activity_data: activity_data || {},
      page_path: page_path || null
    })
    .select()
    .single();

  if (error) {
    logError("Database insert failed", { error: error.message });
    throw error;
  }

  logInfo("Activity tracked successfully", { activity_id: data.id });

  return { 
    success: true,
    activity: data
  };
}, { function_name: "track-activity" }));

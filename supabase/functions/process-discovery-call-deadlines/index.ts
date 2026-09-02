import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { discoveryCallCorsHeaders, env, isAuthorizedWorker, json } from "../_shared/discovery-call-v2.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  if (!isAuthorizedWorker(req)) return json({ success: false, error: "Unauthorized" }, 401);
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const [{ data, error }, { data: calendarData, error: calendarError }] = await Promise.all([
    admin.rpc("process_discovery_call_deadlines_v2"),
    admin.rpc("process_discovery_call_calendar_deadlines_v4"),
  ]);
  if (error || calendarError) return json({ success: false, error: error?.message ?? calendarError?.message }, 500);
  void admin.functions.invoke("process-discovery-call-notifications", {
    body: { limit: 50 },
    headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  });
  void admin.functions.invoke("process-discovery-call-attendance", {
    body: { limit: 50 }, headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  });
  return json({ ...(data ?? { success: true }), calendar: calendarData ?? { expiredMeetingCreations: 0 } });
});

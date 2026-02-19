import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupDirectBody {
  email?: string;
  password?: string;
  fullName?: string;
  dateOfBirth?: string | null;
}

interface SignupDirectResponse {
  ok: boolean;
  userId?: string;
  error?: string;
  code?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function jsonResponse(body: SignupDirectResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[signup-direct] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ ok: false, code: "SERVER_CONFIG_ERROR", error: "Server auth configuration is missing." });
  }

  let payload: SignupDirectBody;
  try {
    payload = await req.json();
  } catch (error) {
    return jsonResponse({ ok: false, code: "INVALID_JSON", error: "Invalid request body." });
  }

  const email = payload.email?.trim().toLowerCase() || "";
  const password = payload.password || "";
  const fullName = payload.fullName?.trim() || "";
  const dateOfBirth = payload.dateOfBirth ?? null;

  if (!email) {
    return jsonResponse({ ok: false, code: "EMAIL_REQUIRED", error: "Email is required." });
  }

  if (!password || password.length < 6) {
    return jsonResponse({ ok: false, code: "WEAK_PASSWORD", error: "Password must be at least 6 characters." });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      date_of_birth: dateOfBirth,
    },
  });

  if (error) {
    const message = error.message || "Failed to create account.";
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("already") || lowerMessage.includes("registered") || lowerMessage.includes("exists")) {
      return jsonResponse({
        ok: false,
        code: "USER_EXISTS",
        error: "An account with this email already exists. Please sign in instead.",
      });
    }

    if (lowerMessage.includes("password")) {
      return jsonResponse({
        ok: false,
        code: "WEAK_PASSWORD",
        error: "Password does not meet requirements. Please use a stronger password.",
      });
    }

    console.error("[signup-direct] createUser failed:", error);
    return jsonResponse({
      ok: false,
      code: "CREATE_USER_FAILED",
      error: message,
    });
  }

  return jsonResponse({
    ok: true,
    userId: data.user?.id,
  });
});

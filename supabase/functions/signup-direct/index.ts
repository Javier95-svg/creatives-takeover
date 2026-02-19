import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signup-fallback",
};

const FALLBACK_HEADER = "x-signup-fallback";
const REQUIRED_FALLBACK_HEADER_VALUE = "1";
const MIN_PASSWORD_LENGTH = 8;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_EMAIL = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupDirectBody {
  email?: string;
  password?: string;
  fullName?: string;
  dateOfBirth?: string | null;
  username?: string | null;
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

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const configuredOrigins = (Deno.env.get("ALLOWED_SIGNUP_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  Deno.env.get("SITE_URL")?.trim(),
  Deno.env.get("APP_URL")?.trim(),
  "https://creatives-takeover.com",
  "https://www.creatives-takeover.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter((origin): origin is string => !!origin);

const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;

function jsonResponse(body: SignupDirectResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const referer = req.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return false;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" });
  }

  const requestOrigin = getRequestOrigin(req);
  if (!isAllowedOrigin(requestOrigin)) {
    console.warn("[signup-direct] Blocked request from untrusted origin", { requestOrigin });
    return jsonResponse({
      ok: false,
      code: "FORBIDDEN_ORIGIN",
      error: "Request origin is not allowed.",
    });
  }

  const fallbackHeader = req.headers.get(FALLBACK_HEADER);
  if (fallbackHeader !== REQUIRED_FALLBACK_HEADER_VALUE) {
    console.warn("[signup-direct] Missing fallback guard header");
    return jsonResponse({
      ok: false,
      code: "FALLBACK_HEADER_REQUIRED",
      error: "Direct signup can only be used from the fallback flow.",
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[signup-direct] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ ok: false, code: "SERVER_CONFIG_ERROR", error: "Server auth configuration is missing." });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(`ip:${clientIp}`, MAX_ATTEMPTS_PER_IP)) {
    return jsonResponse({
      ok: false,
      code: "RATE_LIMITED",
      error: "Too many signup attempts. Please wait and try again.",
    });
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
  const username = payload.username?.trim().toLowerCase() || null;

  if (!email) {
    return jsonResponse({ ok: false, code: "EMAIL_REQUIRED", error: "Email is required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonResponse({ ok: false, code: "INVALID_EMAIL", error: "Please enter a valid email address." });
  }

  if (isRateLimited(`email:${email}`, MAX_ATTEMPTS_PER_EMAIL)) {
    return jsonResponse({
      ok: false,
      code: "RATE_LIMITED",
      error: "Too many signup attempts. Please wait and try again.",
    });
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse({
      ok: false,
      code: "WEAK_PASSWORD",
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      date_of_birth: dateOfBirth,
      username,
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

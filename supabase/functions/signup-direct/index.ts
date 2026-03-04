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
const allowedOriginHostnames = new Set(
  allowedOrigins
    .map((origin) => {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter((hostname): hostname is string => !!hostname),
);

function normalizeUsername(value?: string | null): string | null {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  if (!normalized || normalized.length < 3) {
    return null;
  }

  return normalized;
}

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

  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();

    if (allowedOriginHostnames.has(hostname)) return true;

    if (hostname === "creatives-takeover.com" || hostname.endsWith(".creatives-takeover.com")) {
      return true;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
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
  } catch {
    return jsonResponse({ ok: false, code: "INVALID_JSON", error: "Invalid request body." });
  }

  const email = payload.email?.trim().toLowerCase() || "";
  const password = payload.password || "";
  const fullName = payload.fullName?.trim() || "";
  const dateOfBirth = payload.dateOfBirth ?? null;
  const username = normalizeUsername(payload.username);

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

  if (username) {
    const { data: usernameAvailable, error: usernameError } = await supabaseAdmin.rpc(
      "is_username_available",
      {
        candidate: username,
        current_user_id: null,
      },
    );

    if (usernameError) {
      console.error("[signup-direct] username availability lookup failed:", usernameError);
      return jsonResponse({
        ok: false,
        code: "USERNAME_CHECK_FAILED",
        error: "Could not validate the username right now. Please try again.",
      });
    }

    if (usernameAvailable !== true) {
      return jsonResponse({
        ok: false,
        code: "USERNAME_TAKEN",
        error: "That username is already taken. Please choose another one.",
      });
    }
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

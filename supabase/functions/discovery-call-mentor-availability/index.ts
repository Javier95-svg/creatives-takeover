import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  discoveryCallCorsHeaders,
  encryptDiscoveryCallToken,
  env,
  generateDiscoveryCallToken,
  hashDiscoveryCallToken,
  json,
} from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function validTimezone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

async function limited(req: Request, tokenHash: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `availability:${tokenHash}:${await hashDiscoveryCallToken(ip)}`;
  const { data } = await admin.from("discovery_call_portal_rate_limits").select("request_count, window_started_at").eq("bucket_key", key).maybeSingle();
  const expired = !data || Date.parse(data.window_started_at) < Date.now() - 15 * 60_000;
  const count = expired ? 1 : Number(data.request_count) + 1;
  await admin.from("discovery_call_portal_rate_limits").upsert({
    bucket_key: key, request_count: count,
    window_started_at: expired ? new Date().toISOString() : data?.window_started_at,
    updated_at: new Date().toISOString(),
  });
  return count > 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405, { "Cache-Control": "no-store" });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const rawToken = typeof body.token === "string" ? body.token : "";
  if (rawToken.length < 40 || rawToken.length > 200) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  const tokenHash = await hashDiscoveryCallToken(rawToken);
  if (await limited(req, tokenHash)) return json({ success: false, errorCode: "RATE_LIMITED" }, 429, { "Cache-Control": "no-store" });
  const { data: access } = await admin.from("mentor_availability_access_tokens")
    .select("id, mentor_id, expires_at, revoked_at").eq("token_hash", tokenHash).maybeSingle();
  if (!access || access.revoked_at) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  if (Date.parse(access.expires_at) <= Date.now()) return json({ success: false, errorCode: "TOKEN_EXPIRED" }, 410, { "Cache-Control": "no-store" });
  await admin.from("mentor_availability_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", access.id);
  const action = String(body.action ?? "load");

  if (action === "load") {
    const [{ data: mentor }, { data: settings }, { data: rules }, { data: exceptions }, { data: connection }] = await Promise.all([
      admin.from("mentors").select("id, name, picture").eq("id", access.mentor_id).single(),
      admin.from("mentor_discovery_call_settings").select("discovery_calls_enabled, booking_mode, scheduling_timezone, minimum_notice_hours, booking_window_days, buffer_minutes, allow_request_fallback").eq("mentor_id", access.mentor_id).single(),
      admin.from("mentor_discovery_availability_rules").select("id, weekday, start_local_time, end_local_time, enabled").eq("mentor_id", access.mentor_id).order("weekday"),
      admin.from("mentor_discovery_availability_exceptions").select("id, exception_type, starts_at, ends_at, reason").eq("mentor_id", access.mentor_id).gte("ends_at", new Date().toISOString()).order("starts_at"),
      admin.from("mentor_calendar_connections").select("status, google_account_email, last_synced_at, last_error").eq("mentor_id", access.mentor_id).maybeSingle(),
    ]);
    return json({ success: true, mentor, settings, rules: rules ?? [], exceptions: exceptions ?? [], calendarConnection: connection ?? null }, 200, { "Cache-Control": "no-store" });
  }

  if (action === "save") {
    const timezone = String(body.timezone ?? "UTC");
    const bookingMode = String(body.bookingMode ?? "request");
    const notice = Number(body.minimumNoticeHours ?? 72);
    const windowDays = Number(body.bookingWindowDays ?? 60);
    const buffer = Number(body.bufferMinutes ?? 0);
    const rules = Array.isArray(body.rules) ? body.rules as Array<Record<string, unknown>> : [];
    if (!validTimezone(timezone) || !["request", "instant", "hybrid"].includes(bookingMode)
      || !Number.isInteger(notice) || notice < 1 || notice > 720
      || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 60
      || !Number.isInteger(buffer) || buffer < 0 || buffer > 120
      || rules.length > 50
      || rules.some((rule) => !Number.isInteger(Number(rule.weekday)) || Number(rule.weekday) < 0 || Number(rule.weekday) > 6
        || !/^\d{2}:\d{2}(:\d{2})?$/.test(String(rule.startLocalTime))
        || !/^\d{2}:\d{2}(:\d{2})?$/.test(String(rule.endLocalTime))
        || String(rule.startLocalTime) >= String(rule.endLocalTime))) {
      return json({ success: false, errorCode: "INVALID_AVAILABILITY" }, 422, { "Cache-Control": "no-store" });
    }
    const { data: current, error: currentError } = await admin.from("mentor_discovery_call_settings")
      .select("notification_email, discovery_calls_enabled, legacy_provider, legacy_booking_url")
      .eq("mentor_id", access.mentor_id).single();
    if (currentError || !current) return json({ success: false, errorCode: "MENTOR_UNAVAILABLE" }, 404, { "Cache-Control": "no-store" });
    const { data: saved, error } = await admin.rpc("save_mentor_discovery_settings_v4", {
      p_mentor_id: access.mentor_id,
      p_notification_email: current.notification_email,
      p_discovery_calls_enabled: current.discovery_calls_enabled,
      p_booking_mode: bookingMode,
      p_scheduling_timezone: timezone,
      p_minimum_notice_hours: notice,
      p_booking_window_days: windowDays,
      p_buffer_minutes: buffer,
      p_allow_request_fallback: body.allowRequestFallback !== false,
      p_legacy_provider: current.legacy_provider,
      p_legacy_booking_url: current.legacy_booking_url,
      p_rules: rules,
    });
    if (error) return json({ success: false, error: error.message }, 500, { "Cache-Control": "no-store" });
    return saved?.success
      ? json({ success: true }, 200, { "Cache-Control": "no-store" })
      : json(saved, 422, { "Cache-Control": "no-store" });
  }

  if (action === "addException") {
    const startsAt = String(body.startsAt ?? "");
    const endsAt = String(body.endsAt ?? "");
    const type = String(body.exceptionType ?? "unavailable");
    if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)
      || !["unavailable", "additional"].includes(type)) return json({ success: false, errorCode: "INVALID_AVAILABILITY" }, 422, { "Cache-Control": "no-store" });
    const { data, error } = await admin.from("mentor_discovery_availability_exceptions").insert({
      mentor_id: access.mentor_id, exception_type: type, starts_at: startsAt, ends_at: endsAt,
      reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : null,
    }).select("id, exception_type, starts_at, ends_at, reason").single();
    return error ? json({ success: false, error: error.message }, 500, { "Cache-Control": "no-store" }) : json({ success: true, exception: data }, 200, { "Cache-Control": "no-store" });
  }

  if (action === "deleteException") {
    const { error } = await admin.from("mentor_discovery_availability_exceptions").delete().eq("id", String(body.exceptionId ?? "")).eq("mentor_id", access.mentor_id);
    return error ? json({ success: false, error: error.message }, 500, { "Cache-Control": "no-store" }) : json({ success: true }, 200, { "Cache-Control": "no-store" });
  }

  if (action === "beginGoogleConnect") {
    const clientId = env("GOOGLE_CALENDAR_CLIENT_ID");
    const redirectUri = env("GOOGLE_CALENDAR_OAUTH_REDIRECT_URI");
    if (!clientId || !redirectUri) return json({ success: false, errorCode: "CALENDAR_NOT_CONFIGURED" }, 503, { "Cache-Control": "no-store" });
    const state = generateDiscoveryCallToken();
    await admin.from("discovery_call_calendar_oauth_states").insert({
      mentor_id: access.mentor_id,
      state_hash: await hashDiscoveryCallToken(state),
      encrypted_return_token: await encryptDiscoveryCallToken(rawToken),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: "code",
      access_type: "offline", prompt: "consent", include_granted_scopes: "true",
      scope: "openid email https://www.googleapis.com/auth/calendar.freebusy",
      state,
    });
    return json({ success: true, authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, 200, { "Cache-Control": "no-store" });
  }

  if (action === "disconnectGoogle") {
    await admin.from("mentor_calendar_connections").update({ status: "revoked", encrypted_access_token: null, encrypted_refresh_token: null }).eq("mentor_id", access.mentor_id);
    await admin.from("mentor_calendar_busy_periods").delete().eq("mentor_id", access.mentor_id);
    return json({ success: true }, 200, { "Cache-Control": "no-store" });
  }

  return json({ success: false, errorCode: "INVALID_REQUEST" }, 400, { "Cache-Control": "no-store" });
});

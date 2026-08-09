import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  decryptDiscoveryCallToken,
  encryptDiscoveryCallToken,
  env,
  hashDiscoveryCallToken,
} from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function redirect(status: "connected" | "error", token?: string) {
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const fragment = new URLSearchParams({ ...(token ? { token } : {}), google: status });
  return new Response(null, {
    status: 302,
    headers: { Location: `${appUrl}/mentorship/calls/availability#${fragment}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!code || !state || url.searchParams.has("error")) return redirect("error");
  const { data: stateRow } = await admin.from("discovery_call_calendar_oauth_states")
    .select("id, mentor_id, encrypted_return_token, expires_at, used_at")
    .eq("state_hash", await hashDiscoveryCallToken(state)).maybeSingle();
  if (!stateRow || stateRow.used_at || Date.parse(stateRow.expires_at) <= Date.now()) return redirect("error");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env("GOOGLE_CALENDAR_CLIENT_ID"),
        client_secret: env("GOOGLE_CALENDAR_CLIENT_SECRET"),
        redirect_uri: env("GOOGLE_CALENDAR_OAUTH_REDIRECT_URI"),
        code, grant_type: "authorization_code",
      }),
    });
    const tokenBody = await tokenResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!tokenResponse.ok || typeof tokenBody.access_token !== "string" || typeof tokenBody.refresh_token !== "string") {
      throw new Error("Google did not return the required offline calendar credentials");
    }
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const profile = await profileResponse.json().catch(() => ({})) as Record<string, unknown>;
    await admin.from("mentor_calendar_connections").upsert({
      mentor_id: stateRow.mentor_id,
      status: "active",
      google_account_email: typeof profile.email === "string" ? profile.email.toLowerCase() : null,
      google_calendar_id: "primary",
      encrypted_access_token: await encryptDiscoveryCallToken(tokenBody.access_token),
      encrypted_refresh_token: await encryptDiscoveryCallToken(tokenBody.refresh_token),
      access_token_expires_at: new Date(Date.now() + Number(tokenBody.expires_in ?? 3600) * 1000).toISOString(),
      granted_scopes: String(tokenBody.scope ?? "").split(" ").filter(Boolean),
      next_sync_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: "mentor_id" });
    await admin.from("discovery_call_calendar_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", stateRow.id);
    return redirect("connected", await decryptDiscoveryCallToken(stateRow.encrypted_return_token));
  } catch {
    return redirect("error", await decryptDiscoveryCallToken(stateRow.encrypted_return_token).catch(() => ""));
  }
});

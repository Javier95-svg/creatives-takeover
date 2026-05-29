import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_API = "https://api.supabase.com";
const SUPABASE_OAUTH_AUTHORIZE = `${SUPABASE_API}/v1/oauth/authorize`;
const SUPABASE_OAUTH_TOKEN = `${SUPABASE_API}/v1/oauth/token`;
const REQUIRED_SCOPES = [
  "projects:read",
  "database:read",
  "database:write",
  "auth:read",
  "auth:write",
  "storage:read",
  "storage:write",
  "edge_functions:read",
  "edge_functions:write",
];

type ConnectionRow = Record<string, any>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...corsHeaders },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function addQuery(url: string, params: Record<string, string>): string {
  const next = new URL(url);
  Object.entries(params).forEach(([key, value]) => next.searchParams.set(key, value));
  return next.toString();
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const digest = await sha256(getEnv("INTEGRATION_TOKEN_SECRET"));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const key = await getEncryptionKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)),
  );
  return `${base64Url(iv)}.${base64Url(encrypted)}`;
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function decryptToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const [ivRaw, payloadRaw] = value.split(".");
  if (!ivRaw || !payloadRaw) return null;
  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivRaw) },
    key,
    fromBase64Url(payloadRaw),
  );
  return new TextDecoder().decode(decrypted);
}

async function requireUser(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function apiFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path.startsWith("http") ? path : `${SUPABASE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = typeof json?.message === "string" ? json.message : `Supabase Management API ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return json as T;
}

function normalizeError(error: unknown): { status: "expired" | "error"; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const status = /expired|invalid.*token|unauthorized|forbidden|re-?auth/i.test(message) ? "expired" : "error";
  return { status, message };
}

async function latestConnection(supabaseAdmin: any, userId: string): Promise<ConnectionRow | null> {
  const { data } = await supabaseAdmin
    .from("mvp_builder_supabase_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getConnectionToken(supabaseAdmin: any, connectionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mvp_builder_supabase_connection_secrets")
    .select("encrypted_access_token")
    .eq("connection_id", connectionId)
    .maybeSingle();
  return decryptToken(data?.encrypted_access_token);
}

function publicConnection(connection: ConnectionRow | null) {
  if (!connection) return { connected: false, status: "disconnected", project: null };
  return {
    connected: connection.status === "connected" || connection.status === "syncing",
    status: connection.status,
    lastError: connection.last_error ?? null,
    expiresAt: connection.token_expires_at ?? null,
    connectionId: connection.id,
    scopes: Array.isArray(connection.scopes) ? connection.scopes : [],
    project: connection.project_ref
      ? {
          ref: connection.project_ref,
          name: connection.project_name ?? connection.project_ref,
          region: connection.project_region ?? null,
          status: connection.project_status ?? null,
          organizationId: connection.organization_id ?? null,
          organizationName: connection.organization_name ?? null,
        }
      : null,
  };
}

async function refreshHealth(supabaseAdmin: any, connection: ConnectionRow) {
  const token = await getConnectionToken(supabaseAdmin, connection.id);
  if (!token) throw new Error("Supabase authorization is missing. Please reconnect Supabase.");
  if (connection.project_ref) {
    const project = await apiFetch<any>(token, `/v1/projects/${connection.project_ref}`);
    await supabaseAdmin
      .from("mvp_builder_supabase_connections")
      .update({
        status: "connected",
        project_name: project.name ?? connection.project_name,
        project_region: project.region ?? connection.project_region,
        project_status: project.status ?? connection.project_status,
        last_error: null,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  } else {
    await apiFetch(token, "/v1/projects");
    await supabaseAdmin
      .from("mvp_builder_supabase_connections")
      .update({
        status: "connected",
        last_error: null,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }
}

async function exchangeRefreshToken(refreshToken: string) {
  const response = await fetch(SUPABASE_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getEnv("SUPABASE_OAUTH_CLIENT_ID"),
      client_secret: getEnv("SUPABASE_OAUTH_CLIENT_SECRET"),
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Supabase OAuth refresh failed");
  }
  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return jsonResponse({ ok: false, error: "Missing OAuth callback parameters" }, 400);

      const { data: stateRow } = await supabaseAdmin
        .from("mvp_builder_oauth_states")
        .select("*")
        .eq("state", state)
        .eq("provider", "supabase")
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!stateRow) return jsonResponse({ ok: false, error: "Invalid or expired OAuth state" }, 400);

      const tokenResponse = await fetch(SUPABASE_OAUTH_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${supabaseUrl}/functions/v1/supabase-integration`,
          client_id: getEnv("SUPABASE_OAUTH_CLIENT_ID"),
          client_secret: getEnv("SUPABASE_OAUTH_CLIENT_SECRET"),
        }),
      });
      const tokenJson = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error_description || tokenJson.error || "Supabase OAuth exchange failed");
      }

      const expiresAt = tokenJson.expires_in
        ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
        : null;

      const { data: connection, error } = await supabaseAdmin
        .from("mvp_builder_supabase_connections")
        .upsert({
          user_id: stateRow.user_id,
          mvp_project_id: stateRow.mvp_project_id,
          status: "connected",
          scopes: REQUIRED_SCOPES,
          token_expires_at: expiresAt,
          last_error: null,
          last_health_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;

      await supabaseAdmin.from("mvp_builder_supabase_connection_secrets").upsert({
        connection_id: connection.id,
        encrypted_access_token: await encryptToken(tokenJson.access_token),
        encrypted_refresh_token: await encryptToken(tokenJson.refresh_token),
        token_type: tokenJson.token_type ?? "bearer",
        updated_at: new Date().toISOString(),
      });
      await supabaseAdmin
        .from("mvp_builder_oauth_states")
        .update({ consumed_at: new Date().toISOString() })
        .eq("state", state);

      return redirectResponse(addQuery(stateRow.redirect_to, { supabase_connected: "1" }));
    }

    const user = await requireUser(req, supabaseAdmin);
    if (!user) return jsonResponse({ ok: false, error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const connection = await latestConnection(supabaseAdmin, user.id);

    if (action === "oauth_init") {
      const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : `${req.headers.get("origin") || ""}/mvp-builder`;
      const state = randomState();
      await supabaseAdmin.from("mvp_builder_oauth_states").insert({
        state,
        user_id: user.id,
        provider: "supabase",
        redirect_to: redirectTo,
        mvp_project_id: typeof body.projectId === "string" ? body.projectId : null,
      });
      const authorizeUrl = addQuery(SUPABASE_OAUTH_AUTHORIZE, {
        client_id: getEnv("SUPABASE_OAUTH_CLIENT_ID"),
        redirect_uri: `${supabaseUrl}/functions/v1/supabase-integration`,
        response_type: "code",
        scope: REQUIRED_SCOPES.join(" "),
        state,
      });
      return jsonResponse({ authorizeUrl });
    }

    if (action === "get_connection") {
      if (connection) {
        try {
          await refreshHealth(supabaseAdmin, connection);
          return jsonResponse(publicConnection({ ...connection, status: "connected", last_error: null }));
        } catch (error) {
          const normalized = normalizeError(error);
          await supabaseAdmin
            .from("mvp_builder_supabase_connections")
            .update({ status: normalized.status, last_error: normalized.message, updated_at: new Date().toISOString() })
            .eq("id", connection.id);
          return jsonResponse(publicConnection({ ...connection, status: normalized.status, last_error: normalized.message }));
        }
      }
      return jsonResponse(publicConnection(null));
    }

    if (action === "disconnect") {
      if (connection) {
        await supabaseAdmin
          .from("mvp_builder_supabase_connections")
          .update({ status: "disconnected", project_ref: null, project_name: null, last_error: null, updated_at: new Date().toISOString() })
          .eq("id", connection.id);
      }
      return jsonResponse({ ok: true });
    }

    if (!connection) return jsonResponse({ ok: false, error: "Connect Supabase first." }, 409);
    let token = await getConnectionToken(supabaseAdmin, connection.id);
    if (!token) return jsonResponse({ ok: false, error: "Supabase authorization is missing. Please reconnect Supabase." }, 401);

    if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now() + 60_000) {
      const { data: secretRow } = await supabaseAdmin
        .from("mvp_builder_supabase_connection_secrets")
        .select("encrypted_refresh_token")
        .eq("connection_id", connection.id)
        .maybeSingle();
      const refreshToken = await decryptToken(secretRow?.encrypted_refresh_token);
      if (!refreshToken) throw new Error("Supabase authorization expired. Please reconnect Supabase.");
      const refreshed = await exchangeRefreshToken(refreshToken);
      token = refreshed.access_token;
      await supabaseAdmin.from("mvp_builder_supabase_connection_secrets").upsert({
        connection_id: connection.id,
        encrypted_access_token: await encryptToken(refreshed.access_token),
        encrypted_refresh_token: await encryptToken(refreshed.refresh_token || refreshToken),
        token_type: refreshed.token_type ?? "bearer",
        updated_at: new Date().toISOString(),
      });
      await supabaseAdmin
        .from("mvp_builder_supabase_connections")
        .update({
          token_expires_at: refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null,
          status: "connected",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    if (action === "list_projects") {
      const projects = await apiFetch<any[]>(token, "/v1/projects");
      return jsonResponse({ projects });
    }

    if (action === "select_project") {
      const projectRef = String(body.projectRef || "");
      if (!projectRef) return jsonResponse({ ok: false, error: "projectRef is required" }, 400);
      const project = await apiFetch<any>(token, `/v1/projects/${projectRef}`);
      await supabaseAdmin
        .from("mvp_builder_supabase_connections")
        .update({
          organization_id: project.organization_id ?? project.organization?.id ?? null,
          organization_name: project.organization_name ?? project.organization?.name ?? null,
          project_ref: projectRef,
          project_name: project.name ?? projectRef,
          project_region: project.region ?? null,
          project_status: project.status ?? null,
          status: "connected",
          last_error: null,
          last_health_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
      return jsonResponse({ project });
    }

    if (action === "health") {
      await refreshHealth(supabaseAdmin, connection);
      return jsonResponse({ ok: true });
    }

    if (action === "backend_snapshot") {
      const projectRef = String(body.projectRef || connection.project_ref || "");
      if (!projectRef) return jsonResponse({ ok: false, error: "Select a Supabase project first." }, 409);
      const [project, functions, typescriptTypes, authConfig] = await Promise.all([
        apiFetch(token, `/v1/projects/${projectRef}`).catch((error) => ({ error: String(error?.message || error) })),
        apiFetch(token, `/v1/projects/${projectRef}/functions`).catch((error) => ({ error: String(error?.message || error) })),
        apiFetch(token, `/v1/projects/${projectRef}/types/typescript`).catch((error) => ({ error: String(error?.message || error) })),
        apiFetch(token, `/v1/projects/${projectRef}/config/auth`).catch((error) => ({ error: String(error?.message || error) })),
      ]);
      return jsonResponse({ project, functions, typescriptTypes, authConfig });
    }

    if (action === "apply_backend_change") {
      if (body.confirm !== true) {
        return jsonResponse({ ok: false, error: "Backend changes require explicit confirmation." }, 400);
      }
      return jsonResponse({ ok: false, error: "Backend write orchestration is guarded for v1. Generate a reviewed migration or function update first." }, 409);
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


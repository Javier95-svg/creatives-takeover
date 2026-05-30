import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConnectionRow = Record<string, any>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
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

async function getServiceRoleKey(supabaseAdmin: any, connectionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mvp_builder_supabase_connection_secrets")
    .select("encrypted_access_token")
    .eq("connection_id", connectionId)
    .maybeSingle();
  return decryptToken(data?.encrypted_access_token);
}

function extractProjectRef(projectUrl: string): string | null {
  const match = projectUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

function normalizeProjectUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed.startsWith("http")) return `https://${trimmed}`;
  return trimmed;
}

async function validateCredentials(projectUrl: string, serviceRoleKey: string): Promise<void> {
  const response = await fetch(`${projectUrl}/rest/v1/`, {
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error("Invalid credentials. Check your Project URL and Service Role Key.");
  }
}

function publicConnection(connection: ConnectionRow | null) {
  if (!connection) return { connected: false, status: "disconnected", project: null };
  return {
    connected: connection.status === "connected" || connection.status === "syncing",
    status: connection.status,
    lastError: connection.last_error ?? null,
    expiresAt: null,
    connectionId: connection.id,
    scopes: [],
    project: connection.project_ref
      ? {
          ref: connection.project_ref,
          name: connection.project_name ?? connection.project_ref,
          region: connection.project_region ?? null,
          status: connection.project_status ?? null,
          organizationId: null,
          organizationName: null,
          projectUrl: connection.supabase_account_id ?? null,
        }
      : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const user = await requireUser(req, supabaseAdmin);
    if (!user) return jsonResponse({ ok: false, error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const connection = await latestConnection(supabaseAdmin, user.id);

    // Save direct credentials (project URL + service role key)
    if (action === "save_credentials") {
      const rawUrl = typeof body.projectUrl === "string" ? body.projectUrl : "";
      const rawKey = typeof body.serviceRoleKey === "string" ? body.serviceRoleKey : "";

      if (!rawUrl.trim() || !rawKey.trim()) {
        return jsonResponse({ ok: false, error: "Project URL and Service Role Key are required." }, 400);
      }

      const projectUrl = normalizeProjectUrl(rawUrl);
      const projectRef = extractProjectRef(projectUrl);

      if (!projectRef) {
        return jsonResponse({
          ok: false,
          error: "Invalid Project URL. Expected format: https://xxxxxxxxxxxx.supabase.co",
        }, 400);
      }

      // Validate the credentials before saving
      try {
        await validateCredentials(projectUrl, rawKey.trim());
      } catch (err) {
        return jsonResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Invalid credentials.",
        }, 400);
      }

      const { data: conn, error: upsertError } = await supabaseAdmin
        .from("mvp_builder_supabase_connections")
        .upsert({
          user_id: user.id,
          supabase_account_id: projectUrl,
          project_ref: projectRef,
          project_name: projectRef,
          status: "connected",
          last_error: null,
          last_health_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("*")
        .single();

      if (upsertError) throw upsertError;

      await supabaseAdmin.from("mvp_builder_supabase_connection_secrets").upsert({
        connection_id: conn.id,
        encrypted_access_token: await encryptToken(rawKey.trim()),
        updated_at: new Date().toISOString(),
      });

      return jsonResponse(publicConnection(conn));
    }

    if (action === "get_connection") {
      if (!connection) return jsonResponse(publicConnection(null));

      try {
        const key = await getServiceRoleKey(supabaseAdmin, connection.id);
        if (!key) throw new Error("Credentials missing. Please reconnect.");

        const projectUrl = connection.supabase_account_id || `https://${connection.project_ref}.supabase.co`;
        await validateCredentials(projectUrl, key);

        await supabaseAdmin
          .from("mvp_builder_supabase_connections")
          .update({
            status: "connected",
            last_error: null,
            last_health_check_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        return jsonResponse(publicConnection({ ...connection, status: "connected", last_error: null }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Connection check failed.";
        await supabaseAdmin
          .from("mvp_builder_supabase_connections")
          .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
          .eq("id", connection.id);
        return jsonResponse(publicConnection({ ...connection, status: "error", last_error: message }));
      }
    }

    if (action === "disconnect") {
      if (connection) {
        await supabaseAdmin
          .from("mvp_builder_supabase_connections")
          .update({
            status: "disconnected",
            project_ref: null,
            project_name: null,
            supabase_account_id: null,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
      }
      return jsonResponse({ ok: true });
    }

    if (!connection) return jsonResponse({ ok: false, error: "Connect Supabase first." }, 409);

    const key = await getServiceRoleKey(supabaseAdmin, connection.id);
    if (!key) return jsonResponse({ ok: false, error: "Credentials missing. Please reconnect Supabase." }, 401);

    if (action === "health") {
      const projectUrl = connection.supabase_account_id || `https://${connection.project_ref}.supabase.co`;
      await validateCredentials(projectUrl, key);
      return jsonResponse({ ok: true });
    }

    if (action === "backend_snapshot") {
      const projectUrl = connection.supabase_account_id || `https://${connection.project_ref}.supabase.co`;
      const projectRef = connection.project_ref;

      // Fetch what we can using the service role key directly against the project
      const [tablesResult, authResult] = await Promise.all([
        fetch(`${projectUrl}/rest/v1/`, {
          headers: { "apikey": key, "Authorization": `Bearer ${key}` },
        })
          .then((r) => r.json())
          .catch((err) => ({ error: String(err) })),
        fetch(`${projectUrl}/auth/v1/admin/users?page=1&per_page=1`, {
          headers: { "apikey": key, "Authorization": `Bearer ${key}` },
        })
          .then((r) => ({ ok: r.ok, status: r.status }))
          .catch((err) => ({ error: String(err) })),
      ]);

      return jsonResponse({
        project: { ref: projectRef, name: connection.project_name ?? projectRef, url: projectUrl },
        restApi: tablesResult,
        authStatus: authResult,
        functions: null,
      });
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

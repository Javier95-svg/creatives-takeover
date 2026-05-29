import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const MAX_IMPORT_FILES = 80;
const MAX_FILE_BYTES = 180_000;

type ConnectionRow = Record<string, any>;
type GitHubFileChange = {
  path: string;
  action: "create" | "update" | "delete";
  content?: string;
};

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

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = getEnv("INTEGRATION_TOKEN_SECRET");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
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

async function githubFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path.startsWith("http") ? path : `${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = typeof json?.message === "string" ? json.message : `GitHub API ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return json as T;
}

function normalizeError(error: unknown): { status: "expired" | "error"; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const status = /bad credentials|expired|unauthorized|requires/i.test(message) ? "expired" : "error";
  return { status, message };
}

async function latestConnection(supabaseAdmin: any, userId: string): Promise<ConnectionRow | null> {
  const { data } = await supabaseAdmin
    .from("mvp_builder_github_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getConnectionToken(supabaseAdmin: any, connectionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mvp_builder_github_connection_secrets")
    .select("encrypted_access_token")
    .eq("connection_id", connectionId)
    .maybeSingle();
  return decryptToken(data?.encrypted_access_token);
}

function publicConnection(connection: ConnectionRow | null) {
  if (!connection) return { connected: false, profile: null, status: "disconnected" };
  return {
    connected: connection.status === "connected" || connection.status === "syncing",
    status: connection.status,
    lastError: connection.last_error ?? null,
    expiresAt: connection.token_expires_at ?? null,
    connectionId: connection.id,
    profile: {
      login: connection.github_user_login ?? undefined,
      name: connection.github_user_name ?? null,
      avatar_url: connection.github_avatar_url ?? null,
      scope: Array.isArray(connection.scopes) ? connection.scopes.join(" ") : "",
    },
    repository: connection.repository_full_name
      ? {
          fullName: connection.repository_full_name,
          htmlUrl: connection.repository_html_url ?? null,
          branch: connection.branch || "main",
          defaultBranch: connection.default_branch || "main",
          baseCommitSha: connection.base_commit_sha ?? null,
        }
      : null,
  };
}

async function refreshHealth(supabaseAdmin: any, connection: ConnectionRow) {
  const token = await getConnectionToken(supabaseAdmin, connection.id);
  if (!token) throw new Error("GitHub authorization is missing. Please reconnect GitHub.");
  const user = await githubFetch<any>(token, "/user");
  await supabaseAdmin
    .from("mvp_builder_github_connections")
    .update({
      status: "connected",
      github_user_login: user.login ?? connection.github_user_login,
      github_user_name: user.name ?? connection.github_user_name,
      github_avatar_url: user.avatar_url ?? connection.github_avatar_url,
      last_error: null,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);
}

function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error("Repository must use owner/name format.");
  return { owner, repo };
}

async function importRepository(token: string, fullName: string) {
  const { owner, repo } = parseRepo(fullName);
  const repository = await githubFetch<any>(token, `/repos/${owner}/${repo}`);
  const branchName = "main";
  const branch = await githubFetch<any>(token, `/repos/${owner}/${repo}/branches/${branchName}`);
  const tree = await githubFetch<any>(
    token,
    `/repos/${owner}/${repo}/git/trees/${branch.commit.sha}?recursive=1`,
  );
  const files = (Array.isArray(tree.tree) ? tree.tree : [])
    .filter((item: any) => item.type === "blob" && typeof item.path === "string" && Number(item.size || 0) <= MAX_FILE_BYTES)
    .filter((item: any) => !/(^|\/)(node_modules|dist|build|\.git)\//.test(item.path))
    .slice(0, MAX_IMPORT_FILES);

  const hydrated = await Promise.all(
    files.map(async (item: any) => {
      const blob = await githubFetch<any>(token, item.url);
      const decoded = typeof blob.content === "string"
        ? atob(blob.content.replace(/\s/g, ""))
        : "";
      return { path: item.path, content: decoded, size: item.size };
    }),
  );

  return {
    repository: {
      owner,
      name: repository.name,
      fullName: repository.full_name,
      defaultBranch: repository.default_branch || "main",
      htmlUrl: repository.html_url ?? null,
    },
    branch: branchName,
    baseCommitSha: branch.commit.sha,
    files: hydrated,
  };
}

async function commitChanges(token: string, options: {
  fullName: string;
  baseBranch: string;
  targetBranch: string;
  commitMessage?: string;
  changes: GitHubFileChange[];
}) {
  const { owner, repo } = parseRepo(options.fullName);
  const targetBranch = "main";
  const ref = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`);
  const baseCommit = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);

  const treeEntries = await Promise.all(
    options.changes.map(async (change) => {
      if (change.action === "delete") {
        return { path: change.path, mode: "100644", type: "blob", sha: null };
      }
      const blob = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: change.content ?? "",
          encoding: "utf-8",
        }),
      });
      return { path: change.path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  const tree = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeEntries,
    }),
  });
  const commit = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: options.commitMessage || "Update MVP Builder project",
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });
  await githubFetch(token, `/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return {
    branch: targetBranch,
    commit: {
      sha: commit.sha,
      shortSha: String(commit.sha).slice(0, 7),
      message: commit.message,
      url: commit.html_url || `https://github.com/${options.fullName}/commit/${commit.sha}`,
      committedAt: commit.committer?.date ?? new Date().toISOString(),
    },
  };
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
      const installationId = url.searchParams.get("installation_id");
      if (!code || !state) return jsonResponse({ ok: false, error: "Missing OAuth callback parameters" }, 400);

      const { data: stateRow } = await supabaseAdmin
        .from("mvp_builder_oauth_states")
        .select("*")
        .eq("state", state)
        .eq("provider", "github")
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!stateRow) return jsonResponse({ ok: false, error: "Invalid or expired OAuth state" }, 400);

      const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: getEnv("GITHUB_APP_CLIENT_ID"),
          client_secret: getEnv("GITHUB_APP_CLIENT_SECRET"),
          code,
        }),
      });
      const tokenJson = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error_description || "GitHub OAuth exchange failed");
      }

      const user = await githubFetch<any>(tokenJson.access_token, "/user");
      const expiresAt = tokenJson.expires_in
        ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
        : null;

      const { data: connection, error } = await supabaseAdmin
        .from("mvp_builder_github_connections")
        .upsert({
          user_id: stateRow.user_id,
          mvp_project_id: stateRow.mvp_project_id,
          github_user_login: user.login,
          github_user_name: user.name,
          github_avatar_url: user.avatar_url,
          installation_id: installationId ? Number(installationId) : null,
          status: "connected",
          scopes: ["metadata:read", "contents:read", "contents:write"],
          token_expires_at: expiresAt,
          last_error: null,
          last_health_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;

      await supabaseAdmin.from("mvp_builder_github_connection_secrets").upsert({
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

      return redirectResponse(addQuery(stateRow.redirect_to, { github_connected: "1" }));
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
        provider: "github",
        redirect_to: redirectTo,
        mvp_project_id: typeof body.projectId === "string" ? body.projectId : null,
      });
      const callbackUrl = `${supabaseUrl}/functions/v1/github-integration`;
      const authorizeUrl = addQuery("https://github.com/login/oauth/authorize", {
        client_id: getEnv("GITHUB_APP_CLIENT_ID"),
        redirect_uri: callbackUrl,
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
            .from("mvp_builder_github_connections")
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
          .from("mvp_builder_github_connections")
          .update({ status: "disconnected", last_error: null, repository_full_name: null, updated_at: new Date().toISOString() })
          .eq("id", connection.id);
      }
      return jsonResponse({ ok: true });
    }

    if (!connection) return jsonResponse({ ok: false, error: "Connect GitHub first." }, 409);
    const token = await getConnectionToken(supabaseAdmin, connection.id);
    if (!token) return jsonResponse({ ok: false, error: "GitHub authorization is missing. Please reconnect GitHub." }, 401);

    if (action === "list_repos") {
      const repos = await githubFetch<any[]>(token, "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member");
      return jsonResponse({
        repositories: repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          default_branch: repo.default_branch,
          html_url: repo.html_url,
          updated_at: repo.updated_at,
        })),
      });
    }

    if (action === "list_branches") {
      return jsonResponse({ branches: [{ name: "main" }] });
    }

    if (action === "import_repo") {
      const result = await importRepository(token, String(body.fullName || ""));
      await supabaseAdmin
        .from("mvp_builder_github_connections")
        .update({
          repository_id: null,
          repository_full_name: result.repository.fullName,
          repository_html_url: result.repository.htmlUrl,
          branch: "main",
          default_branch: result.repository.defaultBranch,
          base_commit_sha: result.baseCommitSha,
          status: "connected",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
      return jsonResponse(result);
    }

    if (action === "commit_changes") {
      const result = await commitChanges(token, {
        fullName: String(body.fullName || connection.repository_full_name || ""),
        baseBranch: "main",
        targetBranch: "main",
        commitMessage: typeof body.commitMessage === "string" ? body.commitMessage : undefined,
        changes: Array.isArray(body.changes) ? body.changes : [],
      });
      await supabaseAdmin
        .from("mvp_builder_github_connections")
        .update({
          branch: "main",
          base_commit_sha: result.commit.sha,
          status: "connected",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
      return jsonResponse({ ...result, deploymentTrigger: { type: "main_branch_push", status: "pushed_to_main" } });
    }

    if (action === "list_commits") {
      const fullName = String(body.fullName || connection.repository_full_name || "");
      const { owner, repo } = parseRepo(fullName);
      const commits = await githubFetch<any[]>(token, `/repos/${owner}/${repo}/commits?sha=main&per_page=${Number(body.perPage || 30)}`);
      return jsonResponse({
        commits: commits.map((commit) => ({
          sha: commit.sha,
          shortSha: String(commit.sha).slice(0, 7),
          message: commit.commit?.message ?? "",
          committedAt: commit.commit?.committer?.date ?? null,
          url: commit.html_url ?? null,
          author: commit.commit?.author?.name ?? commit.author?.login ?? null,
        })),
      });
    }

    if (action === "ai_edit" || action === "rollback_to_commit") {
      return jsonResponse({ ok: false, error: `${action} is not available until the GitHub App AI worker is configured.` }, 501);
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


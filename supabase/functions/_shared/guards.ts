// Caller checks for edge functions. The anon key is a valid JWT, so verify_jwt
// alone proves nothing about who is calling: every function decides here
// whether the caller is a signed-in member, an admin, or one of our own jobs.
//
//   const auth = await requireUser(req);
//   if (auth.error) return auth.error;
//   ... use auth.user.id, never a user id from the request body.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from './middleware.ts';
import { isServiceRoleToken } from './service-caller.ts';

const env = (name: string) => Deno.env.get(name) ?? '';

export type CallerUser = { id: string; email: string | null };
type Guarded<T> = { error: null } & T | { error: Response };

let adminClient: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  adminClient ??= createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  return adminClient;
}

export function bearerToken(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
}

export function denied(req: Request, status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The signed-in member making the request, from their session token. */
export async function requireUser(req: Request): Promise<Guarded<{ user: CallerUser }>> {
  const token = bearerToken(req);
  if (!token) return { error: denied(req, 401, 'Authentication required') };
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) return { error: denied(req, 401, 'Authentication required') };
  return { error: null, user: { id: data.user.id, email: data.user.email ?? null } };
}

/** Like requireUser, but also requires the admin role. */
export async function requireAdmin(req: Request): Promise<Guarded<{ user: CallerUser }>> {
  const auth = await requireUser(req);
  if (auth.error) return auth;
  const { data, error } = await serviceClient().rpc('is_admin_user_id', { p_user_id: auth.user.id });
  if (error || data !== true) return { error: denied(req, 403, 'Administrator required') };
  return auth;
}

const verifiedServiceTokens = new Set<string>();

/**
 * Whether the request comes from our own server side: another edge function
 * with this runtime's service key, a database job with the service role key
 * from private.service_config (a different string, see service-caller.ts), or
 * a scheduler sending x-cron-secret. Fails closed when nothing is configured.
 */
export async function isWorkerRequest(req: Request): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && ['CRON_SECRET', 'DISCOVERY_CALL_CRON_SECRET'].some((name) => sameSecret(cronSecret, env(name)))) {
    return true;
  }

  const token = bearerToken(req);
  if (!token) return false;
  if (sameSecret(token, env('SUPABASE_SERVICE_ROLE_KEY')) || verifiedServiceTokens.has(token)) return true;
  if (!isServiceRoleToken(token, '')) return false;

  // The role claim is only trusted once the auth server accepts the token for
  // an admin-only call, which checks its signature even where verify_jwt is off.
  try {
    const response = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env('SUPABASE_ANON_KEY') || token },
    });
    await response.body?.cancel();
    if (!response.ok) return false;
    verifiedServiceTokens.add(token);
    return true;
  } catch {
    return false;
  }
}

export async function requireWorker(req: Request): Promise<Response | null> {
  return (await isWorkerRequest(req)) ? null : denied(req, 403, 'Forbidden');
}

/**
 * At most maxPerMinute calls per key (and user, when given). Fails closed: if
 * the limiter cannot be reached the call is refused rather than run uncapped.
 */
export async function rateLimit(
  req: Request,
  key: string,
  maxPerMinute: number,
  userId: string | null = null,
): Promise<Response | null> {
  const { error } = await serviceClient().rpc('assert_rate_limit', {
    p_key: key,
    p_user_id: userId,
    p_max_per_minute: maxPerMinute,
  });
  if (!error) return null;
  if (/rate_limit_exceeded/i.test(error.message ?? '')) {
    return denied(req, 429, 'Too many requests. Please wait a minute and try again.');
  }
  console.error(`[guards] rate limiter unavailable for ${key.split(':')[0]}:`, error.message);
  return denied(req, 503, 'This is temporarily unavailable. Please try again shortly.');
}

/**
 * Our own jobs, or a signed-in member held to maxPerMinute calls for this
 * feature. For endpoints that spend our AI or API quota on every call.
 */
export async function requireMemberOrWorker(
  req: Request,
  feature: string,
  maxPerMinute: number,
): Promise<Guarded<{ userId: string | null }>> {
  if (await isWorkerRequest(req)) return { error: null, userId: null };
  const auth = await requireUser(req);
  if (auth.error) return auth;
  const limited = await rateLimit(req, `${feature}:${auth.user.id}`, maxPerMinute, auth.user.id);
  if (limited) return { error: limited };
  return { error: null, userId: auth.user.id };
}

/** Our own jobs, or an admin (for jobs the admin pages can also start by hand). */
export async function requireAdminOrWorker(req: Request): Promise<Response | null> {
  if (await isWorkerRequest(req)) return null;
  const admin = await requireAdmin(req);
  return admin.error;
}

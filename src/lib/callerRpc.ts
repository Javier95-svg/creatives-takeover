import { supabase } from '@/integrations/supabase/client';

type RpcResult<T> = { data: T | null; error: { code?: string; message: string } | null };
type RpcClient = { rpc: (name: never, args?: never) => PromiseLike<unknown> };

/**
 * Calls a *_mine database function, which acts for the signed-in caller
 * (auth.uid()) instead of a user id the browser sends.
 *
 * Until supabase/migrations/20261102100000_security_lockdown.sql is applied in
 * production the *_mine functions do not exist (PostgREST answers PGRST202),
 * so the call falls back once to the older user-id version. Remove the
 * fallback after 20261102101000_close_legacy_user_id_rpcs.sql has run.
 */
export async function rpcAsCaller<T = unknown>(
  name: string,
  args: Record<string, unknown>,
  legacy: { name: string; args: Record<string, unknown> },
  client: RpcClient = supabase as unknown as RpcClient,
): Promise<RpcResult<T>> {
  const result = (await client.rpc(name as never, args as never)) as RpcResult<T>;
  if (result.error?.code !== 'PGRST202') return result;
  return (await client.rpc(legacy.name as never, legacy.args as never)) as RpcResult<T>;
}

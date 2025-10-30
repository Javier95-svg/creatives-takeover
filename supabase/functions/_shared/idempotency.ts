import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError } from "./logger.ts";

export async function withIdempotency(
  req: Request,
  keyPrefix: string,
  handler: (ctx: { supabaseAdmin: ReturnType<typeof createClient> }) => Promise<Response>,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const idempotencyKey = req.headers.get("Idempotency-Key");
  const id = idempotencyKey ? `${keyPrefix}:${idempotencyKey}` : undefined;

  try {
    if (id) {
      const { data } = await supabaseAdmin.rpc('idempotency_get', { p_id: id });
      if (data) {
        return new Response(JSON.stringify({ ok: true, reused: true, result: data }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    }

    const res = await handler({ supabaseAdmin });

    if (id && res.ok) {
      try {
        const clone = await res.clone().json().catch(() => ({}));
        await supabaseAdmin.rpc('idempotency_put', { p_id: id, p_result: clone });
      } catch (e) {
        logError('idempotency_store_failed', { error: (e as Error)?.message });
      }
    }
    return res;
  } catch (e) {
    logError('idempotency_wrapper_error', { error: (e as Error)?.message });
    throw e;
  }
}



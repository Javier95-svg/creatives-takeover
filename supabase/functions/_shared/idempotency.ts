import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError } from "./logger.ts";

type IdempotencyStatus = "started" | "processing" | "completed";

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
    if (!id) {
      return await handler({ supabaseAdmin });
    }

    const { data: beginStatus, error: beginError } = await supabaseAdmin.rpc("idempotency_try_begin", { p_id: id });
    if (beginError) {
      throw beginError;
    }

    const status = beginStatus as IdempotencyStatus | null;

    if (status === "completed") {
      const { data } = await supabaseAdmin.rpc("idempotency_get", { p_id: id });
      if (data !== null && data !== undefined) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-idempotent-replay": "true",
          },
        });
      }

      return new Response(JSON.stringify({ error: "Idempotent result unavailable for completed request" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }

    if (status === "processing") {
      return new Response(JSON.stringify({ error: "Request already in progress" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }

    const res = await handler({ supabaseAdmin });

    if (res.ok) {
      try {
        const clone = await res.clone().json().catch(() => ({}));
        await supabaseAdmin.rpc("idempotency_mark_completed", { p_id: id, p_result: clone });
      } catch (e) {
        logError("idempotency_store_failed", { error: (e as Error)?.message });
        await supabaseAdmin.rpc("idempotency_clear", { p_id: id });
      }
    } else {
      await supabaseAdmin.rpc("idempotency_clear", { p_id: id });
    }

    return res;
  } catch (e) {
    if (id) {
      await supabaseAdmin.rpc("idempotency_clear", { p_id: id });
    }
    logError("idempotency_wrapper_error", { error: (e as Error)?.message });
    throw e;
  }
}



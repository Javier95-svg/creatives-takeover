/* eslint-disable no-console */
export type LogContext = Record<string, unknown>;

export function logInfo(message: string, context: LogContext = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
}

export function logWarn(message: string, context: LogContext = {}) {
  console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
}

export function logError(message: string, context: LogContext = {}) {
  const payload = { level: 'error', message, ...context, timestamp: new Date().toISOString() };
  console.error(JSON.stringify(payload));
  // Optional external sink (e.g., Logflare/Generic webhook)
  const webhook = (globalThis as any).Deno?.env.get('LOG_WEBHOOK_URL');
  if (webhook) {
    fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
  }
}

export function withErrorBoundary<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  meta: LogContext = {}
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      const result = await fn(...args);
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (err: any) {
      logError('edge_function_error', { ...meta, error: err?.message, stack: err?.stack });
      const errorCode = typeof err?.code === 'string' ? err.code : 'INTERNAL_ERROR';
      const exposedMessage = err?.expose === true && typeof err?.message === 'string'
        ? err.message
        : 'Internal error';
      return new Response(JSON.stringify({ ok: false, error: exposedMessage, errorCode }), {
        status: typeof err?.status === 'number' ? err.status : 500,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
        },
      });
    }
  };
}



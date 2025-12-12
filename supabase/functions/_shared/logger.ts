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
      return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (err: any) {
      logError('edge_function_error', { ...meta, error: err?.message, stack: err?.stack });
      return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  };
}

/**
 * Log authentication failures with structured context
 */
export function logAuthFailure(
  error: string,
  context: {
    userId?: string | null;
    sessionId?: string;
    endpoint?: string;
    errorCode?: string;
    apiKeyName?: string;
  } = {}
) {
  logError('auth_failure', {
    error,
    errorType: 'authentication',
    ...context,
  });
}

/**
 * Log rate limit events with structured context
 */
export function logRateLimit(
  context: {
    userId?: string | null;
    sessionId?: string;
    endpoint?: string;
    retryAfter?: number;
    limit?: number;
  } = {}
) {
  logWarn('rate_limit_exceeded', {
    errorType: 'rate_limit',
    ...context,
  });
}

/**
 * Log model errors with structured context
 */
export function logModelError(
  error: string,
  context: {
    userId?: string | null;
    sessionId?: string;
    endpoint?: string;
    model?: string;
    statusCode?: number;
    errorCode?: string;
  } = {}
) {
  logError('model_error', {
    error,
    errorType: 'model',
    ...context,
  });
}

/**
 * Log API key validation failures
 */
export function logAPIKeyValidationFailure(
  keyName: string,
  error: string,
  context: {
    endpoint?: string;
  } = {}
) {
  logError('api_key_validation_failure', {
    error,
    errorType: 'api_key',
    keyName,
    ...context,
  });
}



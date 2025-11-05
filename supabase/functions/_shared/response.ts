import { corsHeaders } from "./middleware.ts";

export interface SuccessResponse<T> {
  ok: true;
  data: T;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  metadata?: Record<string, any>
): Response {
  const payload: SuccessResponse<T> = {
    ok: true,
    data,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata })
  };
  
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string,
  code?: string,
  status = 500,
  details?: Record<string, any>
): Response {
  const payload: ErrorResponse = {
    ok: false,
    error,
    code,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };
  
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Create a validation error response
 */
export function validationError(
  message: string,
  fields?: string[]
): Response {
  return errorResponse(
    message,
    'VALIDATION_ERROR',
    400,
    fields ? { fields } : undefined
  );
}

/**
 * Create an unauthorized error response
 */
export function unauthorizedError(
  message = 'Unauthorized'
): Response {
  return errorResponse(message, 'UNAUTHORIZED', 401);
}

/**
 * Create a not found error response
 */
export function notFoundError(
  resource: string
): Response {
  return errorResponse(
    `${resource} not found`,
    'NOT_FOUND',
    404
  );
}

/**
 * Create a rate limit error response
 */
export function rateLimitError(
  resetAt: number
): Response {
  return errorResponse(
    'Rate limit exceeded',
    'RATE_LIMIT_EXCEEDED',
    429,
    { resetAt: new Date(resetAt).toISOString() }
  );
}

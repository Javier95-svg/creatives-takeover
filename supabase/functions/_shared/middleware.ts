import { logInfo, logError } from "./logger.ts";

const ALLOWED_ORIGINS = [
  'https://creatives-takeover.com',
  'https://www.creatives-takeover.com',
  // Vercel preview deployments
  'https://creatives-takeover.vercel.app',
  // Local development
  'http://localhost:5173',
  'http://localhost:4173',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://creatives-takeover.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Fallback for call sites that spread corsHeaders without a request context
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://creatives-takeover.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

/**
 * Handle CORS preflight requests
 */
export async function handleCORS(req: Request): Promise<Response | null> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

// Caller checks live in ./guards.ts (requireUser, requireAdmin, requireWorker).

/**
 * Global error handler wrapper
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<Response> {
  try {
    const result = await fn();
    return new Response(
      JSON.stringify({ 
        ok: true, 
        data: result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    logError('Edge function error', { ...context, error: error?.message ?? String(error) });
    
    const statusCode = error.statusCode || error.status || 500;
    const errorMessage = error.message || 'Internal server error';
    const errorCode = error.code || 'INTERNAL_ERROR';
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);
  
  if (!limit || now > limit.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (limit.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt };
  }
  
  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count, resetAt: limit.resetAt };
}

/**
 * Validate request body against schema
 */
export function validateBody<T>(
  body: any,
  requiredFields: string[]
): { valid: boolean; data?: T; error?: string } {
  const missing = requiredFields.filter(field => !(field in body));
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true, data: body as T };
}

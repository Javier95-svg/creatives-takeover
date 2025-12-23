import { logInfo, logError } from "./logger.ts";

// Allowed origins for CORS - restrict to your domain
const ALLOWED_ORIGINS = [
  'https://creatives-takeover.com',
  'https://www.creatives-takeover.com',
  // Add development origins if needed (remove in production)
  ...(Deno.env.get('ENVIRONMENT') === 'development' ? [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000'
  ] : [])
];

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Legacy export for backward compatibility (deprecated - use getCorsHeaders instead)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

/**
 * Extract and verify user from auth header
 */
export async function extractUser(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { userId: null, error: 'Missing authorization header' };
  }

  try {
    // Extract JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    
    // In a real implementation, you would verify the JWT here
    // For now, we'll extract the user ID from the token payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: payload.sub || null, error: null };
  } catch (error) {
    logError('Auth extraction failed', error);
    return { userId: null, error: 'Invalid authorization token' };
  }
}

/**
 * Require authentication for a request
 */
export async function withAuth(
  req: Request,
  handler: (req: Request, userId: string) => Promise<Response>
): Promise<Response> {
  const { userId, error } = await extractUser(req);
  
  if (error || !userId) {
    return new Response(
      JSON.stringify({ ok: false, error: error || 'Unauthorized', code: 'AUTH_REQUIRED' }),
      { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
  
  return await handler(req, userId);
}

/**
 * Global error handler wrapper
 */
export async function withErrorHandler<T>(
  req: Request,
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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    logError('Edge function error', error, context);
    
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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
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

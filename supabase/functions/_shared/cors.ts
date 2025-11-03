/**
 * Shared CORS headers for all Supabase Edge Functions
 * 
 * Usage:
 * import { corsHeaders } from '../_shared/cors.ts';
 * 
 * // In OPTIONS handler
 * return new Response(null, { headers: corsHeaders });
 * 
 * // In response
 * return new Response(JSON.stringify(data), {
 *   headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 * });
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper function to create a CORS response
 */
export function corsResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper function to handle OPTIONS preflight requests
 */
export function handleOptionsRequest(): Response {
  return new Response(null, { headers: corsHeaders });
}


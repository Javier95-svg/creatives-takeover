import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOnboardingContext } from '../_shared/onboarding-context.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { error: 'Sign in to continue' });

  // Service role, because the *_as_v1 functions are not callable by the
  // browser; the caller's identity comes from their verified JWT only.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return json(401, { error: 'Sign in to continue' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid onboarding request' });
  }

  const result = await handleOnboardingContext(admin, user.id, body);
  return json(result.status, result.body);
});

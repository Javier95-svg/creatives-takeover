import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@2.0.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: 'Authentication required' }, 401);
  const { data: allowed, error: adminError } = await admin.rpc('is_admin_user_id', { p_user_id: auth.user.id });
  if (adminError || allowed !== true) return json({ error: 'Administrator required' }, 403);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.invitationId === 'string' ? body.invitationId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'Invalid invitation' }, 400);
  const { data: invitation, error: lookupError } = await admin.from('account_invitations')
    .select('id,email,user_type,expires_at,revoked_at,last_emailed_at').eq('id', id).maybeSingle();
  if (lookupError || !invitation || invitation.revoked_at || new Date(invitation.expires_at) <= new Date()) {
    return json({ error: 'Active invitation not found' }, 404);
  }
  if (invitation.last_emailed_at && Date.now() - new Date(invitation.last_emailed_at).getTime() < 60_000) {
    return json({ sent: true, alreadySent: true });
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return json({ error: 'Email delivery is not configured' }, 503);
  const appUrl = (Deno.env.get('APP_URL') || 'https://creatives-takeover.com').replace(/\/$/, '');
  const role = invitation.user_type === 'mentor' ? 'mentor' : 'marketplace provider';
  const from = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: `${Deno.env.get('FROM_NAME') || 'Creatives Takeover'} <${from}>`,
    to: invitation.email,
    subject: `Your ${role} invitation to Creatives Takeover`,
    html: `<p>You have been invited to apply as a ${role} on Creatives Takeover.</p><p>Sign in with this email address, verify it, and complete the onboarding questions. An administrator will review your request before category access opens.</p><p><a href="${appUrl}/onboarding">Open onboarding</a></p><p>This invitation expires in 30 days.</p>`,
  });
  if (result.error || !result.data?.id) {
    await admin.from('account_invitations').update({ last_email_error: (result.error?.message ?? 'Provider did not return a message ID').slice(0, 300) }).eq('id', id);
    return json({ error: 'Invitation saved, but email delivery failed' }, 502);
  }
  const { error: statusError } = await admin.from('account_invitations').update({ last_emailed_at: new Date().toISOString(), last_email_error: null }).eq('id', id);
  if (statusError) return json({ error: 'Email sent, but delivery status could not be saved' }, 500);
  return json({ sent: true });
});

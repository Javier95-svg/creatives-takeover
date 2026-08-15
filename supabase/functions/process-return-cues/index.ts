import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const labels: Record<string, { headline: string; body: string; cta: string }> = {
  investor_follow_up_due: {
    headline: 'Your investor follow-up is due',
    body: 'Open the prospect you saved, review your notes, and move the relationship one step forward.',
    cta: 'Continue investor research',
  },
  mentor_follow_up_due: {
    headline: 'Your mentor follow-up is due',
    body: 'Return to the mentor you saved and continue the conversation while the context is still fresh.',
    cta: 'Continue the relationship',
  },
};

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  const authorization = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const suppliedCron = request.headers.get('x-cron-secret') || '';
  if (authorization !== serviceKey && (!cronSecret || suppliedCron !== cronSecret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const appUrl = (Deno.env.get('APP_URL') || 'https://creatives-takeover.com').replace(/\/$/, '');
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.rpc('claim_due_return_cues_v1', { p_limit: 50 });
  if (error) return json({ error: error.message }, 500);

  let inApp = 0;
  let emailed = 0;
  let suppressed = 0;
  for (const cue of data || []) {
    inApp += 1;
    if (!cue.send_email || !cue.email) {
      suppressed += 1;
      continue;
    }
    const copy = labels[cue.reason_key] || {
      headline: 'Your planned next action is ready',
      body: 'Continue the action you planned while the context is still fresh.',
      cta: 'Continue your next action',
    };
    let delivered = false;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: cue.user_id,
          email: cue.email,
          fullName: cue.full_name,
          sequence: 'progress_nudge',
          contextHeadline: copy.headline,
          contextBody: copy.body,
          ctaUrl: `${appUrl}${cue.cta_url}`,
          ctaLabel: copy.cta,
        }),
      });
      const result = await response.json();
      delivered = response.ok && result?.ok === true && result?.skipped !== true;
      if (delivered) emailed += 1;
      else suppressed += 1;
    } catch {
      delivered = false;
    }
    await supabase.rpc('finalize_return_cue_email_v1', {
      p_cue_id: cue.cue_id,
      p_delivered: delivered,
    });
  }
  return json({ ok: true, claimed: data?.length || 0, inApp, emailed, suppressed });
});

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isServiceRoleToken } from '../_shared/service-caller.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

// Only the button label is set here. The email's words come from the
// follow_up_due or rooms_reply sequence, built from data rather than caller copy.
const ctaLabels: Record<string, string> = {
  investor_follow_up_due: 'Continue investor research',
  mentor_follow_up_due: 'Continue the relationship',
  discovery_follow_up_due: 'Open my conversations',
  rooms_reply_received: 'Read the reply',
};

/** A reply to the founder's post in Rooms, queued by the post_comments trigger. */
const ROOMS_REPLY = 'rooms_reply_received';

const followUpKind = (reasonKey: string) =>
  reasonKey === 'discovery_follow_up_due' ? 'discovery'
    : reasonKey === 'investor_follow_up_due' ? 'investor'
      : reasonKey === 'mentor_follow_up_due' ? 'mentor'
        : undefined;

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  const authorization = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const suppliedCron = request.headers.get('x-cron-secret') || '';
  // The cron job calls with the service role key from private.service_config,
  // which is not the same string as this runtime's key; verify_jwt is on, so
  // the gateway has checked the token and its role claim can be trusted.
  if (!isServiceRoleToken(authorization, serviceKey) && (!cronSecret || suppliedCron !== cronSecret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const appUrl = (Deno.env.get('APP_URL') || 'https://creatives-takeover.com').replace(/\/$/, '');
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.rpc('claim_due_return_cues_v1', { p_limit: 50 });
  if (error) return json({ error: error.message }, 500);

  // The claim does not return metadata; the follow-up's name, and a reply's
  // post title and count, live there.
  const cueIds = (data || []).map((cue: { cue_id: string }) => cue.cue_id);
  const names = new Map<string, string>();
  const posts = new Map<string, { title?: string; replies?: number }>();
  if (cueIds.length) {
    const { data: rows } = await supabase.from('user_return_cues').select('id, metadata').in('id', cueIds);
    for (const row of rows || []) {
      const name = typeof row.metadata?.name === 'string' ? row.metadata.name.trim().slice(0, 60) : '';
      if (name) names.set(row.id, name);
      const title = typeof row.metadata?.postTitle === 'string' ? row.metadata.postTitle.trim().slice(0, 120) : '';
      const replies = Number(row.metadata?.replies);
      posts.set(row.id, { title: title || undefined, replies: Number.isFinite(replies) && replies > 0 ? Math.floor(replies) : undefined });
    }
  }

  let inApp = 0;
  let emailed = 0;
  let suppressed = 0;
  for (const cue of data || []) {
    inApp += 1;
    if (!cue.send_email || !cue.email) {
      suppressed += 1;
      continue;
    }
    let delivered = false;
    const reply = cue.reason_key === ROOMS_REPLY ? posts.get(cue.cue_id) : undefined;
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
          // Not progress_nudge: that sequence goes down the inactive-user path,
          // which ignores what the follow-up is about.
          ...(cue.reason_key === ROOMS_REPLY ? {
            sequence: 'rooms_reply',
            replierName: names.get(cue.cue_id),
            postTitle: reply?.title,
            replyCount: reply?.replies,
            ctaLabel: (reply?.replies ?? 1) > 1 ? 'Read the replies' : ctaLabels[ROOMS_REPLY],
          } : {
            sequence: 'follow_up_due',
            followUpName: names.get(cue.cue_id),
            followUpKind: followUpKind(cue.reason_key),
            ctaLabel: ctaLabels[cue.reason_key] || 'Continue your next action',
          }),
          ctaUrl: `${appUrl}${cue.cta_url}`,
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

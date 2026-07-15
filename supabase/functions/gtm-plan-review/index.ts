import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getUserFromAuth } from '../_shared/credit-deduction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const currentWeekStart = () => {
  const date = new Date();
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const body = await req.json() as { planId?: string; weekStart?: string };
    if (!body.planId) return json({ error: 'planId is required' }, 400);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: plan } = await admin.from('gtm_plans' as never).select('id').eq('id', body.planId).eq('user_id', user.id).maybeSingle();
    if (!plan) return json({ error: 'GTM plan not found' }, 404);

    const { data: plays } = await admin
      .from('gtm_plays' as never)
      .select('id,channel_name,play_content,status,rank')
      .eq('plan_id', body.planId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('rank', { ascending: true })
      .limit(2);
    const activePlays = (plays as Array<Record<string, any>> | null) ?? [];
    let play = activePlays[0] ?? null;

    let experiment: Record<string, any> | null = null;
    if (activePlays.length > 0) {
      const { data: sprints } = await admin
        .from('traction_engine_sprints' as never)
        .select('id,source_gtm_play_id')
        .eq('user_id', user.id)
        .in('source_gtm_play_id', activePlays.map((item) => item.id))
        .order('created_at', { ascending: false })
        .limit(4);
      const linkedSprints = (sprints as Array<{ id: string; source_gtm_play_id: string }> | null) ?? [];
      if (linkedSprints.length > 0) {
        const { data: experiments } = await admin
          .from('traction_engine_experiments' as never)
          .select('id,sprint_id,decision,pass,result_value,target_value,created_at')
          .eq('user_id', user.id)
          .in('sprint_id', linkedSprints.map((item) => item.id))
          .order('created_at', { ascending: false })
          .limit(1);
        experiment = (experiments as Array<Record<string, any>> | null)?.[0] ?? null;
        if (experiment) {
          const linkedSprint = linkedSprints.find((item) => item.id === experiment?.sprint_id);
          play = activePlays.find((item) => item.id === linkedSprint?.source_gtm_play_id) ?? play;
        }
      }
    }

    let decision: 'collect_evidence' | 'double_down' | 'iterate' | 'kill' = 'collect_evidence';
    let nextBestAction = play ? `Run and log the first ${play.channel_name} experiment.` : 'Activate one focused GTM play.';
    let evidenceSummary = play ? 'No Traction Engine result has been logged for this play yet.' : 'No active play is linked to this plan.';
    if (experiment) {
      decision = experiment.decision === 'double_down' || experiment.decision === 'iterate' || experiment.decision === 'kill'
        ? experiment.decision
        : experiment.pass ? 'double_down' : 'iterate';
      nextBestAction = decision === 'double_down'
        ? `Repeat the winning ${play.channel_name} play with a higher target.`
        : decision === 'kill'
          ? `Pause ${play.channel_name} and activate the next ranked channel.`
          : `Change one message or audience variable before the next ${play.channel_name} run.`;
      evidenceSummary = experiment.pass
        ? `The latest experiment met its target (${experiment.result_value}/${experiment.target_value}).`
        : `The latest experiment missed its target (${experiment.result_value}/${experiment.target_value}).`;
    }

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart ?? '') ? body.weekStart! : currentWeekStart();
    const payload = {
      plan_id: body.planId,
      play_id: play?.id ?? null,
      traction_experiment_id: experiment?.id ?? null,
      user_id: user.id,
      week_start: weekStart,
      decision,
      next_best_action: nextBestAction,
      evidence_summary: evidenceSummary,
    };
    const { data: review, error } = await admin
      .from('gtm_weekly_reviews' as never)
      .upsert(payload as never, { onConflict: 'plan_id,week_start' })
      .select('*')
      .single();
    if (error) throw error;
    return json({ success: true, review });
  } catch (error) {
    console.error('GTM weekly review failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Weekly review failed' }, 500);
  }
});

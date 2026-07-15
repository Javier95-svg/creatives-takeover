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
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const planWeek = (generatedAt?: string) => {
  const generated = new Date(generatedAt ?? '').getTime();
  if (!Number.isFinite(generated)) return 1;
  return Math.min(6, Math.max(1, Math.floor((Date.now() - generated) / 604_800_000) + 1));
};

const adaptationFor = (decision: string, channel: string, metric: string, target: number) => {
  if (decision === 'double_down') {
    const higherTarget = Math.max(target + 1, Math.ceil(target * 1.25));
    return {
      objective: `Scale the proven ${channel} play to ${higherTarget} ${metric.toLowerCase()}.`,
      actions: [`Repeat the winning ${channel} play with a ${higherTarget} target.`, 'Reuse the strongest audience and message combination.', 'Increase the sample while holding the offer constant.'],
      target: higherTarget,
    };
  }
  if (decision === 'kill') return {
    objective: `Stop spending on ${channel} and activate the next eligible channel.`,
    actions: [`Pause the ${channel} play.`, 'Activate the next ranked eligible play.', 'Carry the customer learning into one new controlled experiment.'],
    target,
  };
  if (decision === 'iterate') return {
    objective: `Iterate ${channel} by changing one variable and preserving comparability.`,
    actions: ['Choose one variable: audience, trigger, offer, or message.', `Run the revised ${channel} play against the same ${metric.toLowerCase()} target.`, 'Log the result and decision in Traction Engine.'],
    target,
  };
  return {
    objective: `Collect the first trustworthy ${channel} performance signal.`,
    actions: [`Launch one measurement-ready ${channel} experiment.`, `Track ${metric.toLowerCase()} against a target of ${target}.`, 'Log the result and decision in Traction Engine before changing strategy.'],
    target,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const body = await req.json() as { planId?: string; weekStart?: string };
    if (!body.planId) return json({ error: 'planId is required' }, 400);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: planRow } = await admin.from('gtm_plans' as never)
      .select('id,plan_content').eq('id', body.planId).eq('user_id', user.id).maybeSingle();
    if (!planRow) return json({ error: 'GTM plan not found' }, 404);
    const analysis = structuredClone((planRow as Record<string, any>).plan_content ?? {});
    if (analysis.schemaVersion !== 2) return json({ error: 'Upgrade this legacy plan before running an adaptive review.' }, 409);

    const { data: playRows } = await admin.from('gtm_plays' as never)
      .select('id,channel_name,play_content,status,rank').eq('plan_id', body.planId).eq('user_id', user.id)
      .order('rank', { ascending: true });
    const allPlays = (playRows as Array<Record<string, any>> | null) ?? [];
    const activePlays = allPlays.filter((item) => item.status === 'active');
    let play = activePlays[0] ?? null;
    let sprint: Record<string, any> | null = null;
    let experiment: Record<string, any> | null = null;

    if (activePlays.length > 0) {
      const { data: sprintRows } = await admin.from('traction_engine_sprints' as never)
        .select('id,source_gtm_play_id').eq('user_id', user.id)
        .in('source_gtm_play_id', activePlays.map((item) => item.id)).order('created_at', { ascending: false }).limit(8);
      const linkedSprints = (sprintRows as Array<Record<string, any>> | null) ?? [];
      if (linkedSprints.length > 0) {
        const { data: experiments } = await admin.from('traction_engine_experiments' as never)
          .select('id,sprint_id,decision,pass,result_value,target_value,created_at').eq('user_id', user.id)
          .in('sprint_id', linkedSprints.map((item) => item.id)).order('created_at', { ascending: false }).limit(1);
        experiment = (experiments as Array<Record<string, any>> | null)?.[0] ?? null;
        sprint = experiment ? linkedSprints.find((item) => item.id === experiment?.sprint_id) ?? null : linkedSprints[0];
        play = activePlays.find((item) => item.id === sprint?.source_gtm_play_id) ?? play;
      }
    }

    const playContent = (play?.play_content ?? analysis.plays?.find((item: any) => item.id === play?.id) ?? {}) as Record<string, any>;
    const channel = String(play?.channel_name ?? playContent.channelName ?? 'primary GTM');
    const metric = String(playContent.metric ?? 'Validated outcomes');
    const target = Number(experiment?.target_value ?? playContent.target ?? 1) || 1;
    let decision: 'collect_evidence' | 'double_down' | 'iterate' | 'kill' = 'collect_evidence';
    if (experiment) decision = experiment.decision === 'double_down' || experiment.decision === 'iterate' || experiment.decision === 'kill'
      ? experiment.decision : experiment.pass ? 'double_down' : 'iterate';

    const nextBestAction = decision === 'double_down' ? `Repeat the winning ${channel} play with a higher target.`
      : decision === 'kill' ? `Pause ${channel} and activate the next ranked channel.`
        : decision === 'iterate' ? `Change one message or audience variable before the next ${channel} run.`
          : play ? `Run and log the first ${channel} experiment.` : 'Activate one focused GTM play.';
    const evidenceSummary = experiment
      ? `${experiment.pass ? 'Met' : 'Missed'} the latest target (${experiment.result_value}/${experiment.target_value}). Traction Engine decision: ${decision.replace('_', ' ')}.`
      : play ? 'No Traction Engine result has been logged. The review will collect evidence instead of inventing a conclusion.' : 'No active play is linked to this plan.';

    const thisWeek = planWeek(analysis.generatedAt);
    const nextWeek = Math.min(6, thisWeek + 1);
    const adaptation = adaptationFor(decision, channel, metric, target);
    const previousWeek = (analysis.sixWeekPlan ?? []).find((item: any) => Number(item.week) === nextWeek);
    analysis.sixWeekPlan = (analysis.sixWeekPlan ?? []).map((item: any) => Number(item.week) === nextWeek
      ? { ...item, objective: adaptation.objective, actions: adaptation.actions }
      : item);

    let nextActiveId = play?.id ?? null;
    if (decision === 'kill' && play) {
      const replacement = allPlays.find((item) => item.id !== play.id && item.status === 'active')
        ?? allPlays.find((item) => item.status === 'backlog');
      await admin.from('gtm_plays' as never).update({ status: 'paused' } as never).eq('id', play.id).eq('user_id', user.id);
      if (replacement) {
        nextActiveId = replacement.id;
        await admin.from('gtm_plays' as never).update({ status: 'active' } as never).eq('id', replacement.id).eq('user_id', user.id);
      }
    }

    analysis.plays = (analysis.plays ?? []).map((item: any) => {
      if (item.id === play?.id) return {
        ...item, status: decision === 'kill' ? 'paused' : item.status,
        target: decision === 'double_down' ? adaptation.target : item.target,
        actual: experiment ? Number(experiment.result_value) : item.actual,
        tractionSprintId: sprint?.id ?? item.tractionSprintId,
      };
      if (item.id === nextActiveId && decision === 'kill') return { ...item, status: 'active' };
      return item;
    });

    const primaryForTasks = analysis.plays.find((item: any) => item.id === nextActiveId) ?? analysis.plays[0];
    const newTasks = adaptation.actions.map((action: string, index: number) => ({
      id: `${primaryForTasks?.id ?? 'plan'}-week-${nextWeek}-review-task-${index + 1}`,
      playId: primaryForTasks?.id ?? '', week: nextWeek, title: action, detail: adaptation.objective,
      owner: 'Founder', timeEstimateMinutes: Math.max(30, Math.round(Number(analysis.intake?.weeklyTimeHours ?? 3) * 60 / adaptation.actions.length)),
      output: index === adaptation.actions.length - 1 ? 'A logged Traction decision' : adaptation.objective,
      metric: primaryForTasks?.metric ?? metric, status: 'todo',
    }));
    analysis.tasks = [...(analysis.tasks ?? []).filter((task: any) => Number(task.week) !== nextWeek), ...newTasks];

    const completed = analysis.tasks.filter((task: any) => task.status === 'done').length;
    const positioningConfidence = analysis.researchStatus === 'complete' ? 85 : analysis.researchStatus === 'limited' ? 62 : 40;
    const channelEvidence = experiment ? 75 : 30;
    const executionConsistency = clamp(30 + (completed / Math.max(1, analysis.tasks.length)) * 70);
    const outcomeProgress = experiment ? clamp(Number(experiment.result_value) / Math.max(1, Number(experiment.target_value)) * 100) : 25;
    const overall = clamp(positioningConfidence * .25 + channelEvidence * .3 + executionConsistency * .25 + outcomeProgress * .2);
    const healthSnapshot = {
      overall, positioningConfidence, channelEvidence, executionConsistency, outcomeProgress,
      label: overall >= 80 ? 'compounding' : overall >= 65 ? 'healthy' : overall >= 45 ? 'forming' : 'fragile',
      risks: [...(!experiment ? ['No linked Traction result yet.'] : []), ...(completed === 0 ? ['The execution cadence has not started.'] : [])],
      nextActions: [nextBestAction, adaptation.actions[0]],
    };
    analysis.health = healthSnapshot;

    const taskRows = newTasks.map((task: any) => ({
      id: task.id, user_id: user.id, plan_id: body.planId, play_id: task.playId || null, week_number: task.week,
      title: task.title, detail: task.detail, owner_label: task.owner, time_estimate_minutes: task.timeEstimateMinutes,
      expected_output: task.output, metric: task.metric, status: task.status,
    }));
    await admin.from('gtm_tasks' as never).delete().eq('plan_id', body.planId).eq('user_id', user.id).eq('week_number', nextWeek);
    const { error: taskError } = await admin.from('gtm_tasks' as never).insert(taskRows as never);
    if (taskError) throw taskError;
    const { error: planError } = await admin.from('gtm_plans' as never).update({ plan_content: analysis } as never).eq('id', body.planId).eq('user_id', user.id);
    if (planError) throw planError;

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart ?? '') ? body.weekStart! : currentWeekStart();
    const reviewPayload = {
      plan_id: body.planId, play_id: play?.id ?? null, traction_experiment_id: experiment?.id ?? null,
      user_id: user.id, week_start: weekStart, decision, next_best_action: nextBestAction,
      evidence_summary: evidenceSummary,
      adaptation: { week: nextWeek, previousObjective: previousWeek?.objective, nextObjective: adaptation.objective, nextActions: adaptation.actions },
      health_snapshot: healthSnapshot,
    };
    const { data: review, error: reviewError } = await admin.from('gtm_weekly_reviews' as never)
      .upsert(reviewPayload as never, { onConflict: 'plan_id,week_start' }).select('*').single();
    if (reviewError) throw reviewError;
    return json({ success: true, review, analysis });
  } catch (error) {
    console.error('GTM weekly review failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Weekly review failed' }, 500);
  }
});

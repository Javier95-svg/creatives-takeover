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

type ReviewInput = { wins: string; misses: string; objections: string; customerLanguage: string; blockers: string; notes: string };

const cleanReviewInput = (value: unknown): ReviewInput => {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const clean = (key: keyof ReviewInput) => typeof input[key] === 'string' ? String(input[key]).trim().slice(0, 1600) : '';
  return { wins: clean('wins'), misses: clean('misses'), objections: clean('objections'), customerLanguage: clean('customerLanguage'), blockers: clean('blockers'), notes: clean('notes') };
};

const safeStringArray = (value: unknown, fallback: string[] = []) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim().slice(0, 600)).slice(0, 8)
  : fallback;

async function generateAdaptiveReview(args: {
  analysis: Record<string, any>;
  decision: string;
  channel: string;
  metric: string;
  target: number;
  experimentHistory: Array<Record<string, any>>;
  reviewInput: ReviewInput;
  fallback: { objective: string; actions: string[]; target: number };
}) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const founderSignals = Object.entries(args.reviewInput).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`);
  if (!apiKey || (args.experimentHistory.length === 0 && founderSignals.length === 0)) {
    return {
      ...args.fallback,
      changedVariables: args.decision === 'iterate' ? ['one controlled play variable'] : [],
      rationale: 'Used the Traction decision and available founder evidence without adding an unsupported conclusion.',
      signals: founderSignals.slice(0, 5),
      changeLog: [`Applied the fixed ${args.decision.replace('_', ' ')} decision to the next due week.`],
      assumptionsToAdd: [] as string[], assumptionsToRetire: [] as string[], messagePatch: '', assetUpdates: [] as Array<Record<string, string>>,
    };
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 2200,
        messages: [
          { role: 'system', content: 'You revise a founder GTM plan from measured evidence. The supplied Traction decision is immutable: never override it. Return JSON only. Change the minimum necessary future work; never claim a result not present in the evidence.' },
          { role: 'user', content: `FIXED DECISION: ${args.decision}\nCHANNEL: ${args.channel}\nMETRIC/TARGET: ${args.metric} / ${args.target}\nEXPERIMENT HISTORY: ${JSON.stringify(args.experimentHistory)}\nFOUNDER CHECK-IN: ${JSON.stringify(args.reviewInput)}\nCURRENT POSITIONING: ${JSON.stringify(args.analysis.positioning)}\nCURRENT PLAY: ${JSON.stringify((args.analysis.plays ?? []).find((item: any) => item.channelName === args.channel))}\nFALLBACK ADAPTATION: ${JSON.stringify(args.fallback)}\n\nReturn {"objective":"","actions":["","",""],"target":0,"changedVariables":[""],"rationale":"","signals":[""],"changeLog":[""],"assumptionsToAdd":[""],"assumptionsToRetire":[""],"messagePatch":"","assetUpdates":[{"type":"outreach_sequence","content":""}]}. Preserve comparability. For iterate, change exactly one of audience, trigger, offer, or message. Use exact customer language only when supplied.` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Adaptive review model failed: ${response.status}`);
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    const actions = safeStringArray(parsed.actions, args.fallback.actions).slice(0, 4);
    const changedVariables = safeStringArray(parsed.changedVariables).slice(0, args.decision === 'iterate' ? 1 : 4);
    return {
      objective: typeof parsed.objective === 'string' && parsed.objective.trim() ? parsed.objective.trim().slice(0, 500) : args.fallback.objective,
      actions: actions.length > 0 ? actions : args.fallback.actions,
      target: args.decision === 'double_down' ? Math.max(args.fallback.target, Number(parsed.target) || 0) : args.fallback.target,
      changedVariables,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale.trim().slice(0, 1000) : '',
      signals: safeStringArray(parsed.signals),
      changeLog: safeStringArray(parsed.changeLog),
      assumptionsToAdd: safeStringArray(parsed.assumptionsToAdd),
      assumptionsToRetire: safeStringArray(parsed.assumptionsToRetire),
      messagePatch: typeof parsed.messagePatch === 'string' ? parsed.messagePatch.trim().slice(0, 1200) : '',
      assetUpdates: Array.isArray(parsed.assetUpdates) ? parsed.assetUpdates.filter((item: any) => typeof item?.type === 'string' && typeof item?.content === 'string').slice(0, 2) : [],
    };
  } catch (error) {
    console.warn('Adaptive GTM review fell back to deterministic rules:', error);
    return {
      ...args.fallback,
      changedVariables: args.decision === 'iterate' ? ['one controlled play variable'] : [],
      rationale: 'The adaptive model was unavailable, so the plan used the fixed Traction decision without inventing learning.',
      signals: founderSignals.slice(0, 5),
      changeLog: [`Applied the fixed ${args.decision.replace('_', ' ')} decision to the next due week.`],
      assumptionsToAdd: [] as string[], assumptionsToRetire: [] as string[], messagePatch: '', assetUpdates: [] as Array<Record<string, string>>,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const body = await req.json() as { planId?: string; weekStart?: string; reviewInput?: unknown };
    if (!body.planId) return json({ error: 'planId is required' }, 400);
    const reviewInput = cleanReviewInput(body.reviewInput);
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
    let experimentHistory: Array<Record<string, any>> = [];
    let linkedSprints: Array<Record<string, any>> = [];

    if (activePlays.length > 0) {
      const { data: sprintRows } = await admin.from('traction_engine_sprints' as never)
        .select('id,source_gtm_play_id').eq('user_id', user.id)
        .in('source_gtm_play_id', activePlays.map((item) => item.id)).order('created_at', { ascending: false }).limit(8);
      linkedSprints = (sprintRows as Array<Record<string, any>> | null) ?? [];
      if (linkedSprints.length > 0) {
        const { data: experiments } = await admin.from('traction_engine_experiments' as never)
          .select('id,sprint_id,decision,pass,result_value,target_value,created_at').eq('user_id', user.id)
          .in('sprint_id', linkedSprints.map((item) => item.id)).order('created_at', { ascending: false }).limit(6);
        experimentHistory = (experiments as Array<Record<string, any>> | null) ?? [];
        experiment = experimentHistory[0] ?? null;
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
    const baseAdaptation = adaptationFor(decision, channel, metric, target);
    const adaptation = await generateAdaptiveReview({
      analysis,
      decision,
      channel,
      metric,
      target,
      experimentHistory,
      reviewInput,
      fallback: baseAdaptation,
    });
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
        message: adaptation.messagePatch || item.message,
        actual: experiment ? Number(experiment.result_value) : item.actual,
        tractionSprintId: sprint?.id ?? item.tractionSprintId,
      };
      if (item.id === nextActiveId && decision === 'kill') return { ...item, status: 'active' };
      return item;
    });

    if (adaptation.assumptionsToRetire.length > 0) {
      analysis.assumptions = (analysis.assumptions ?? []).filter((assumption: string) => !adaptation.assumptionsToRetire.some((retired: string) => assumption.toLowerCase().includes(retired.toLowerCase())));
    }
    analysis.assumptions = Array.from(new Set([...(analysis.assumptions ?? []), ...adaptation.assumptionsToAdd])).slice(0, 20);
    if (adaptation.assetUpdates.length > 0) {
      analysis.assets = (analysis.assets ?? []).map((asset: any) => {
        if (asset.playId !== play?.id) return asset;
        const update = adaptation.assetUpdates.find((item: any) => item.type === asset.type);
        return update ? { ...asset, content: String(update.content).slice(0, 6000), status: 'draft', updatedAt: new Date().toISOString() } : asset;
      });
    }

    const primaryForTasks = analysis.plays.find((item: any) => item.id === nextActiveId) ?? analysis.plays[0];
    const newTasks = adaptation.actions.map((action: string, index: number) => ({
      id: `${primaryForTasks?.id ?? 'plan'}-week-${nextWeek}-review-task-${index + 1}`,
      playId: primaryForTasks?.id ?? '', week: nextWeek, title: action, detail: adaptation.objective,
      owner: 'Founder', timeEstimateMinutes: Math.max(30, Math.round(Number(analysis.intake?.weeklyTimeHours ?? 3) * 60 / adaptation.actions.length)),
      output: index === adaptation.actions.length - 1 ? 'A logged Traction decision' : adaptation.objective,
      metric: primaryForTasks?.metric ?? metric, status: 'todo',
    }));
    analysis.tasks = [...(analysis.tasks ?? []).filter((task: any) => Number(task.week) !== nextWeek), ...newTasks];

    const currentPlayIds = (analysis.plays ?? []).map((item: any) => item.id).filter(Boolean);
    let pipelineQuery = admin.from('gtm_pipeline_entries' as never)
      .select('stage,value,source_channel_id,play_id').eq('plan_id', body.planId).eq('user_id', user.id);
    if (currentPlayIds.length > 0) pipelineQuery = pipelineQuery.in('play_id', currentPlayIds);
    const { data: pipelineRows } = await pipelineQuery;
    const pipeline = (pipelineRows as Array<Record<string, any>> | null) ?? [];
    const activePipeline = pipeline.filter((item) => item.stage !== 'lost');
    const attributedPipelineValue = activePipeline.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
    const dueTasks = analysis.tasks.filter((task: any) => Number(task.week) <= thisWeek && task.status !== 'skipped');
    const completedDueTasks = dueTasks.filter((task: any) => task.status === 'done');
    const verifiedEvidence = (analysis.evidenceItems ?? []).filter((item: any) => item.verified).length;
    const claims = analysis.claimAttributions ?? [];
    const sourcedClaims = claims.filter((claim: any) => !claim.assumption && Array.isArray(claim.sourceIds) && claim.sourceIds.length > 0).length;
    const claimCoverage = claims.length > 0 ? sourcedClaims / claims.length : 0;
    const positioningConfidence = clamp((analysis.researchStatus === 'complete' ? 55 : analysis.researchStatus === 'limited' ? 40 : 20) + Math.min(20, verifiedEvidence * 5) + claimCoverage * 25);
    const measuredPlayIds = new Set(experimentHistory.map((item) => linkedSprints.find((linked) => linked.id === item.sprint_id)?.source_gtm_play_id).filter(Boolean));
    const channelEvidence = clamp(measuredPlayIds.size * 25 + Math.min(25, activePipeline.length * 5) + (experimentHistory.length > 0 ? 25 : 0));
    const executionConsistency = clamp(dueTasks.length > 0 ? (completedDueTasks.length / dueTasks.length) * 100 : 0);
    const outcomeProgress = experiment ? clamp(Number(experiment.result_value) / Math.max(1, Number(experiment.target_value)) * 100) : pipeline.some((item) => item.stage === 'customer') ? 70 : 0;
    const overall = clamp(positioningConfidence * .25 + channelEvidence * .3 + executionConsistency * .25 + outcomeProgress * .2);
    const healthSnapshot = {
      overall, positioningConfidence, channelEvidence, executionConsistency, outcomeProgress,
      label: overall >= 80 ? 'compounding' : overall >= 65 ? 'healthy' : overall >= 45 ? 'forming' : 'fragile',
      risks: [...(!experiment ? ['No linked Traction result yet.'] : []), ...(dueTasks.length > 0 && completedDueTasks.length === 0 ? ['No due GTM task has been completed.'] : []), ...(claims.length > 0 && claimCoverage < .6 ? ['Most strategic claims are not yet tied to evidence.'] : [])],
      nextActions: [nextBestAction, adaptation.actions[0]],
      currentWeek: thisWeek,
      dueTaskCount: dueTasks.length,
      completedDueTaskCount: completedDueTasks.length,
      measuredPlayCount: measuredPlayIds.size,
      attributedPipelineValue,
      calculation: [`Positioning uses research status, ${verifiedEvidence} verified sources, and ${Math.round(claimCoverage * 100)}% claim coverage.`, `Channel evidence uses ${experimentHistory.length} recent experiments and ${activePipeline.length} attributed pipeline records.`, `Execution uses ${completedDueTasks.length}/${dueTasks.length} tasks due through week ${thisWeek}; future tasks are excluded.`, 'Outcome uses the latest attributable play result, with closed pipeline used only when no play result exists.'],
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
    const playWrites = await Promise.all((analysis.plays ?? []).map((item: any) => admin.from('gtm_plays' as never)
      .update({ status: item.status, play_content: item } as never).eq('id', item.id).eq('plan_id', body.planId).eq('user_id', user.id)));
    const playWriteError = playWrites.find((result) => result.error)?.error;
    if (playWriteError) throw playWriteError;
    if ((analysis.assets ?? []).length > 0) {
      const { error: assetError } = await admin.from('gtm_play_assets' as never).upsert((analysis.assets ?? []).map((asset: any) => ({
        id: asset.id, user_id: user.id, plan_id: body.planId, play_id: asset.playId, asset_type: asset.type,
        title: asset.title, content: asset.content, status: asset.status,
      })) as never);
      if (assetError) throw assetError;
    }
    const { error: planError } = await admin.from('gtm_plans' as never).update({ plan_content: analysis } as never).eq('id', body.planId).eq('user_id', user.id);
    if (planError) throw planError;

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart ?? '') ? body.weekStart! : currentWeekStart();
    const reviewPayload = {
      plan_id: body.planId, play_id: play?.id ?? null, traction_experiment_id: experiment?.id ?? null,
      user_id: user.id, week_start: weekStart, decision, next_best_action: nextBestAction,
      evidence_summary: evidenceSummary,
      adaptation: { week: nextWeek, previousObjective: previousWeek?.objective, nextObjective: adaptation.objective, nextActions: adaptation.actions, changedVariables: adaptation.changedVariables, rationale: adaptation.rationale },
      health_snapshot: healthSnapshot,
      review_input: reviewInput,
      signals: adaptation.signals,
      change_log: adaptation.changeLog,
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

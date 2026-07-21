import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getUserFromAuth } from '../_shared/credit-deduction.ts';
import {
  evaluateOutcomeContract,
  type JourneyTool,
  type VerificationMode,
} from '../_shared/outcome-contracts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const TOOLS = new Set<JourneyTool>(['icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine']);
const STAGES: Record<JourneyTool, string> = {
  icp_builder: 'identity', demo_studio: 'prototype', pmf_lab: 'validation',
  mvp_builder: 'building', gtm_strategist: 'launch', traction_engine: 'traction',
};
const ARTIFACT_TYPES: Record<JourneyTool, string> = {
  icp_builder: 'customer_decision_brief',
  demo_studio: 'interactive_proof_page',
  pmf_lab: 'pmf_decision_report',
  mvp_builder: 'evidence_backed_mvp',
  gtm_strategist: 'gtm_acquisition_play',
  traction_engine: 'verified_traction_ledger',
};
const HANDOFF_DESTINATIONS: Record<JourneyTool, JourneyTool[]> = {
  icp_builder: ['pmf_lab'],
  demo_studio: ['pmf_lab'],
  pmf_lab: ['mvp_builder'],
  mvp_builder: ['gtm_strategist'],
  gtm_strategist: ['traction_engine'],
  traction_engine: ['gtm_strategist', 'icp_builder'],
};

const textValue = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const recordValue = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown>
  : {};
const arrayValue = (value: unknown) => Array.isArray(value) ? value : [];
const hasText = (value: unknown) => textValue(value, 2000).length > 0;
const authenticUrl = (value: unknown) => {
  try {
    const url = new URL(textValue(value, 1000));
    return ['http:', 'https:'].includes(url.protocol)
      && url.hostname.includes('.')
      && !['example.com', 'example.org', 'localhost'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};
const normalizeAssumption = (value: unknown) => textValue(value, 500).toLowerCase().replace(/\s+/g, ' ');
const fingerprintAssumption = async (value: unknown) => {
  const normalized = normalizeAssumption(value);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

async function loadAuthoritativeChecks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tool: JourneyTool,
  artifactId: string,
): Promise<Record<string, boolean | number | string | null>> {
  if (tool === 'icp_builder') {
    const { data, error } = await supabase.from('icp_analysis_results')
      .select('analysis_data').eq('id', artifactId).eq('user_id', userId).maybeSingle();
    if (error || !data) throw new Error('The ICP artifact was not found for this account');
    const artifact = recordValue(data.analysis_data);
    const document = recordValue(artifact.draftDocument);
    const brief = recordValue(document.decisionBrief);
    const confidence = recordValue(document.confidence);
    const sources = arrayValue(document.sources).map(recordValue);
    const missingSignals = arrayValue(confidence.missingSignals).filter(hasText);
    const assumptionPrompts = ['customer', 'pain', 'build'].map((key) => (
      recordValue(recordValue(document[key]).evidence).missingSignalPrompt
    )).filter(hasText);
    const { data: assumptions } = await supabase.from('journey_assumptions')
      .select('id').eq('user_id', userId).eq('source_artifact_id', artifactId);
    const assumptionIds = (assumptions ?? []).map((item) => item.id);
    const { data: signals } = assumptionIds.length
      ? await supabase.from('journey_assumption_signals')
        .select('participant_fingerprint,status').eq('user_id', userId).in('assumption_id', assumptionIds)
      : { data: [] };
    const independentSignals = new Set((signals ?? []).map((item) => item.participant_fingerprint)).size;
    const resolvedSignals = (signals ?? []).filter((item) => ['confirmed', 'rejected'].includes(item.status)).length;
    return {
      primary_segment: hasText(brief.primarySegment),
      non_fit_segment: hasText(brief.nonFitSegment),
      three_ranked_pains: arrayValue(brief.rankedPains).map(recordValue).filter((pain) => hasText(pain.pain)).length >= 3,
      buying_trigger: hasText(brief.buyingTrigger),
      current_alternative: hasText(brief.currentAlternative),
      reachable_channels: arrayValue(brief.reachableChannels).filter(hasText).length > 0,
      authentic_citation: sources.some((source) => authenticUrl(source.url)),
      confidence_level: ['low', 'medium', 'high'].includes(textValue(confidence.level, 20)),
      assumptions_registered: (assumptions?.length ?? 0) > 0 && missingSignals.length + assumptionPrompts.length > 0,
      five_interview_plan: arrayValue(brief.interviewValidationPlan).map(recordValue)
        .filter((item) => hasText(item.question) && hasText(item.successSignal)).length === 5,
      five_interview_signals: independentSignals >= 5,
      assumptions_resolved: independentSignals >= 5 && resolvedSignals >= 5,
    };
  }

  if (tool === 'demo_studio') {
    const { data: demo, error } = await supabase.from('demo_studio_demos')
      .select('id,project_id,status,public_id').eq('id', artifactId).eq('owner_id', userId).maybeSingle();
    if (error || !demo) throw new Error('The Demo Studio artifact was not found for this account');
    const [{ data: steps }, { data: launch }, { data: events }, { data: signups }] = await Promise.all([
      supabase.from('demo_studio_demo_steps').select('id,asset_url,caption').eq('demo_id', artifactId).order('position'),
      supabase.from('demo_studio_launch_pages').select('cta_label,primary_demo_id').eq('project_id', demo.project_id).maybeSingle(),
      supabase.from('demo_studio_events').select('id,type').eq('demo_id', artifactId).limit(1),
      supabase.from('demo_studio_signups').select('id').eq('project_id', demo.project_id).limit(1),
    ]);
    const stepRows = steps ?? [];
    const stepIds = stepRows.map((step) => step.id);
    const { data: hotspots } = stepIds.length
      ? await supabase.from('demo_studio_demo_hotspots').select('step_id,x,y,w,h,action,action_target').in('step_id', stepIds)
      : { data: [] };
    const brokenHotspot = (hotspots ?? []).some((hotspot) => {
      const x = Number(hotspot.x); const y = Number(hotspot.y); const w = Number(hotspot.w); const h = Number(hotspot.h);
      if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) return true;
      if (hotspot.action === 'goto') return !stepIds.includes(hotspot.action_target);
      if (hotspot.action === 'url') return !authenticUrl(hotspot.action_target);
      return hotspot.action !== 'next';
    });
    const noPlaceholders = stepRows.every((step) => hasText(step.asset_url) && !/placeholder/i.test(String(step.asset_url)));
    const published = demo.status === 'published' && hasText(demo.public_id);
    return {
      interactive_steps: stepRows.length >= 2,
      working_hotspots: (hotspots?.length ?? 0) > 0 && !brokenHotspot,
      captions_complete: stepRows.length >= 2 && stepRows.every((step) => hasText(step.caption)),
      single_cta: Boolean(launch && launch.primary_demo_id === artifactId && hasText(launch.cta_label)),
      lead_capture: Boolean(launch && launch.primary_demo_id === artifactId),
      analytics: published,
      published,
      no_unresolved_placeholders: noPlaceholders,
      no_broken_interactions: stepRows.length >= 2 && !brokenHotspot,
      external_activity: (events?.length ?? 0) > 0 || (signups?.length ?? 0) > 0,
    };
  }

  if (tool === 'pmf_lab') {
    const { data, error } = await supabase.from('pmf_analysis_results')
      .select('analysis_data,data_sources').eq('id', artifactId).eq('user_id', userId).maybeSingle();
    if (error || !data) throw new Error('The PMF report was not found for this account');
    const analysis = recordValue(data.analysis_data);
    const signalCount = Number(analysis.evidenceSignalCount ?? 0);
    const directCount = Number(analysis.directEvidenceSignalCount ?? signalCount);
    return {
      report_generated: Object.keys(analysis).length > 0,
      decision_present: hasText(analysis.decision),
      weighted_sources_present: signalCount > 0 || arrayValue(data.data_sources).length > 0,
      directional_signals: signalCount >= 5 && directCount >= 5,
      emerging_patterns: signalCount >= 10 && directCount >= 5,
      decision_grade: analysis.evidenceGrade === 'decision_grade' && signalCount >= 25 && directCount >= 5,
      duplicates_removed: Number.isFinite(Number(analysis.duplicateEvidenceCount ?? 0)),
    };
  }

  if (tool === 'mvp_builder') {
    const { data, error } = await supabase.from('mvp_projects')
      .select('project_files,versions,deployment_status,deployment_url,metadata').eq('id', artifactId).eq('user_id', userId).maybeSingle();
    if (error || !data) throw new Error('The MVP project was not found for this account');
    const metadata = recordValue(data.metadata);
    const setup = recordValue(metadata.setupInput);
    const validation = recordValue(metadata.lastPublishValidation);
    const smoke = recordValue(validation.smokeTest);
    const structural = recordValue(validation.structuralChecks);
    const files = arrayValue(data.project_files).map(recordValue);
    const source = files.map((file) => textValue(file.content, 1_000_000)).join('\n');
    const features = arrayValue(setup.essentialFeatures).filter(hasText);
    const evidenceManifest = recordValue(setup.evidenceManifest);
    const evidenceBacked = setup.buildEvidenceMode === 'evidence_backed';
    const published = data.deployment_status === 'deployed' && authenticUrl(data.deployment_url);
    return {
      evidence_manifest_approved: evidenceBacked && hasText(setup.evidenceApprovedAt) && arrayValue(evidenceManifest.sources).length > 0,
      one_customer: hasText(setup.coreCustomer),
      one_core_job: hasText(setup.coreJob),
      success_event: hasText(setup.successEvent),
      feature_budget: features.length >= 1 && features.length <= 3,
      project_generated: files.length > 0,
      preview_ready: files.length > 0,
      primary_flow_present: structural.primaryFlow === true,
      primary_flow_smoke_test: smoke.passed === true && smoke.primaryActionTriggered === true,
      responsive_ui: structural.responsive === true,
      no_runtime_errors: Array.isArray(smoke.runtimeErrors) && smoke.runtimeErrors.length === 0,
      rollback_support: structural.rollback === true && arrayValue(data.versions).length > 0,
      analytics_injected_on_publish: hasText(setup.successEvent) && /analytics|track\s*\(|captureEvent|data-event/i.test(source),
      published,
      external_success_event: false,
    };
  }

  if (tool === 'gtm_strategist') {
    const { data, error } = await supabase.from('gtm_plans')
      .select('plan_content').eq('id', artifactId).eq('user_id', userId).maybeSingle();
    if (error || !data) throw new Error('The GTM plan was not found for this account');
    const plan = recordValue(data.plan_content);
    const channels = arrayValue(plan.channels).map(recordValue);
    const plays = arrayValue(plan.plays).map(recordValue);
    const primary = channels.find((channel) => channel.role === 'primary');
    const primaryPlay = plays.find((play) => play.channelId === primary?.id) ?? plays[0];
    const claims = arrayValue(plan.claimAttributions).map(recordValue).filter((claim) => claim.assumption !== true);
    const messaging = recordValue(plan.messaging);
    const assets = arrayValue(plan.assets).map(recordValue);
    const weeks = arrayValue(plan.sixWeekPlan).map(recordValue);
    const metrics = recordValue(plan.metrics);
    const killRule = recordValue(primaryPlay?.structuredKillRule);
    return {
      primary_channel: Boolean(primary),
      fallback_channel: channels.some((channel) => channel.role === 'secondary'),
      claim_level_evidence: hasText(messaging.headline) && hasText(messaging.hookLine) && claims.length > 0
        && claims.every((claim) => arrayValue(claim.sourceIds).length > 0),
      usable_campaign_assets: Boolean(primaryPlay && assets.some((asset) => asset.playId === primaryPlay.id && hasText(asset.title) && hasText(asset.content))),
      six_week_targets: weeks.length >= 6 && weeks.slice(0, 6).every((week) => hasText(week.objective) && arrayValue(week.actions).some(hasText))
        && hasText(metrics.primaryOutcome) && arrayValue(metrics.leading).length > 0,
      budget_and_time_constraints: Number(primaryPlay?.weeklyTimeHours) > 0 && Number(primaryPlay?.weeklyBudget) >= 0,
      structured_kill_rule: hasText(killRule.metric) && Number.isFinite(Number(killRule.threshold))
        && Number(killRule.observationWindowWeeks) > 0 && Number(killRule.minSampleSize) > 0,
      traction_sprint_created: hasText(primaryPlay?.tractionSprintId),
    };
  }

  if (artifactId !== `traction-ledger-${userId}`) throw new Error('The Traction ledger id is invalid for this account');
  const { data: logs, error } = await supabase.from('traction_engine_weekly_logs')
    .select('id,week_start_date,seven_day_active_users,thirty_day_active_users,revenue,score_breakdown')
    .eq('user_id', userId).order('week_start_date', { ascending: false }).limit(6);
  if (error || !logs?.length) throw new Error('The Traction ledger was not found for this account');
  const logIds = logs.map((log) => log.id);
  const { data: decisions } = await supabase.from('traction_engine_experiments')
    .select('weekly_log_id,efficiency_score,recommended_decision').eq('user_id', userId).in('weekly_log_id', logIds);
  const weekTimes = [...new Set(logs.map((log) => new Date(`${log.week_start_date}T00:00:00Z`).getTime()))].sort((a, b) => b - a);
  let consecutive = weekTimes.length > 0 ? 1 : 0;
  for (let index = 1; index < weekTimes.length; index += 1) {
    if (Math.round((weekTimes[index - 1] - weekTimes[index]) / 604800000) !== 1) break;
    consecutive += 1;
  }
  const verifiedWeeks = logs.filter((log) => ['platform', 'corroborated'].includes(textValue(recordValue(log.score_breakdown).retentionSource, 30))).length;
  const distinctDecisionWeeks = new Set((decisions ?? []).map((decision) => decision.weekly_log_id)).size;
  return {
    six_consecutive_weeks: consecutive >= 6,
    three_distinct_decision_weeks: distinctDecisionWeeks >= 3,
    source_badges: logs.every((log) => ['platform', 'manual', 'corroborated'].includes(textValue(recordValue(log.score_breakdown).retentionSource, 30))),
    acquisition_efficiency: (decisions ?? []).every((decision) => Number.isFinite(Number(decision.efficiency_score))),
    retention: logs.every((log) => Number.isFinite(Number(log.seven_day_active_users)) && Number.isFinite(Number(log.thirty_day_active_users))),
    revenue_where_available: logs.every((log) => log.revenue === null || Number.isFinite(Number(log.revenue))),
    decision_recommendations: (decisions ?? []).length > 0 && (decisions ?? []).every((decision) => hasText(decision.recommended_decision)),
    exportable_report: consecutive >= 6 && distinctDecisionWeeks >= 3,
    three_verified_weeks: verifiedWeeks >= 3,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'Authentication required' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Service is not configured' }, 503);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const body = recordValue(await req.json());
    const action = textValue(body.action, 40) || 'evaluate';

    if (action === 'register_assumptions') {
      const sourceArtifactId = textValue(body.sourceArtifactId, 200);
      const statements = Array.isArray(body.statements)
        ? [...new Set(body.statements.map((statement) => textValue(statement, 500)).filter((statement) => statement.length >= 5))]
        : [];
      if (!sourceArtifactId || statements.length === 0) {
        return json({ error: 'Source artifact and at least one assumption are required' }, 400);
      }
      const rows = await Promise.all(statements.slice(0, 25).map(async (statement) => ({
        user_id: user.id,
        source_artifact_id: sourceArtifactId,
        fingerprint: await fingerprintAssumption(statement),
        statement,
        status: 'untested',
        latest_source_tool: 'icp_builder',
        latest_source_artifact_id: sourceArtifactId,
        latest_rationale: 'Registered from the original ICP decision.',
      })));
      const { error: insertError } = await supabase.from('journey_assumptions').upsert(rows, {
        onConflict: 'user_id,fingerprint', ignoreDuplicates: true,
      });
      if (insertError) throw insertError;
      const { data, error } = await supabase.from('journey_assumptions')
        .select('id,fingerprint,statement,status,current_version,source_artifact_id')
        .eq('user_id', user.id)
        .in('fingerprint', rows.map((row) => row.fingerprint));
      if (error) throw error;
      return json({ ok: true, assumptions: data ?? [] });
    }

    if (action === 'list_assumptions') {
      const sourceArtifactId = textValue(body.sourceArtifactId, 200);
      let query = supabase.from('journey_assumptions')
        .select('id,fingerprint,statement,status,current_version,source_artifact_id,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (sourceArtifactId) query = query.eq('source_artifact_id', sourceArtifactId);
      const { data, error } = await query;
      if (error) throw error;
      return json({ ok: true, assumptions: data ?? [] });
    }

    if (action === 'record_assumption_signal') {
      const assumptionFingerprint = textValue(body.assumptionFingerprint, 100);
      const sourceTool = textValue(body.sourceTool, 40) as JourneyTool;
      const sourceArtifactId = textValue(body.sourceArtifactId, 200);
      const participantFingerprint = textValue(body.participantFingerprint, 200);
      const status = textValue(body.status, 20);
      const verificationMode = textValue(body.verificationMode, 40) as VerificationMode || 'founder_reported';
      if (!assumptionFingerprint || !TOOLS.has(sourceTool) || sourceTool === 'icp_builder'
        || !sourceArtifactId || !participantFingerprint || !['confirmed', 'rejected'].includes(status)) {
        return json({ error: 'A mapped assumption, independent signal, source, and confirmed or rejected status are required' }, 400);
      }
      const { data: assumption, error: assumptionError } = await supabase.from('journey_assumptions')
        .select('id,source_artifact_id').eq('user_id', user.id).eq('fingerprint', assumptionFingerprint).single();
      if (assumptionError || !assumption) return json({ error: 'The selected ICP assumption was not found' }, 404);
      const { error: signalError } = await supabase.from('journey_assumption_signals').upsert({
        user_id: user.id,
        assumption_id: assumption.id,
        source_tool: sourceTool,
        source_artifact_id: sourceArtifactId,
        participant_fingerprint: participantFingerprint,
        status,
        verification_mode: verificationMode,
        rationale: textValue(body.rationale, 1000) || null,
      }, { onConflict: 'user_id,assumption_id,source_tool,source_artifact_id,participant_fingerprint' });
      if (signalError) throw signalError;
      const { data: signals, error: signalsError } = await supabase.from('journey_assumption_signals')
        .select('status').eq('user_id', user.id).eq('assumption_id', assumption.id);
      if (signalsError) throw signalsError;
      const confirmations = (signals ?? []).filter((signal) => signal.status === 'confirmed').length;
      const rejections = (signals ?? []).filter((signal) => signal.status === 'rejected').length;
      const earnedStatus = confirmations === rejections ? 'untested' : confirmations > rejections ? 'confirmed' : 'rejected';
      const { data, error } = await supabase.from('journey_assumptions').update({
        status: earnedStatus,
        latest_source_tool: sourceTool,
        latest_source_artifact_id: sourceArtifactId,
        latest_rationale: textValue(body.rationale, 1000) || `${confirmations} confirming and ${rejections} rejecting independent signals.`,
      }).eq('id', assumption.id).eq('user_id', user.id).select('*').single();
      if (error) throw error;

      const { data: relatedAssumptions } = await supabase.from('journey_assumptions')
        .select('id').eq('user_id', user.id).eq('source_artifact_id', assumption.source_artifact_id);
      const relatedIds = (relatedAssumptions ?? []).map((item) => item.id);
      if (relatedIds.length > 0) {
        const { data: relatedSignals } = await supabase.from('journey_assumption_signals')
          .select('participant_fingerprint,status').eq('user_id', user.id).in('assumption_id', relatedIds);
        const independentSignals = new Set((relatedSignals ?? []).map((item) => item.participant_fingerprint)).size;
        const resolvedSignals = (relatedSignals ?? []).filter((item) => ['confirmed', 'rejected'].includes(item.status)).length;
        const { data: currentIcp } = await supabase.from('journey_outcomes')
          .select('id,quality_checks,evidence_manifest').eq('user_id', user.id).eq('tool', 'icp_builder')
          .eq('artifact_id', assumption.source_artifact_id).maybeSingle();
        if (currentIcp) {
          const qualityChecks = {
            ...recordValue(currentIcp.quality_checks),
            five_interview_signals: independentSignals >= 5,
            assumptions_resolved: independentSignals >= 5 && resolvedSignals >= 5,
          };
          delete qualityChecks._evaluation;
          const evaluation = evaluateOutcomeContract({
            tool: 'icp_builder', qualityChecks, verificationMode: independentSignals >= 5 ? 'corroborated' : 'founder_reported',
          });
          await supabase.from('journey_outcomes').update({
            status: evaluation.status,
            verification_mode: evaluation.verificationMode,
            evaluation_version: evaluation.evaluatorVersion,
            completion_score: evaluation.completionScore,
            quality_checks: { ...qualityChecks, _evaluation: evaluation },
            last_evaluated_at: new Date().toISOString(),
            verified_at: evaluation.status === 'verified' ? new Date().toISOString() : null,
          }).eq('id', currentIcp.id).eq('user_id', user.id);
        }
      }
      return json({ ok: true, assumption: data, signalSummary: { confirmations, rejections } });
    }

    if (action === 'evaluate') {
      const input = recordValue(body.input);
      const tool = textValue(input.tool, 40) as JourneyTool;
      if (!TOOLS.has(tool)) return json({ error: 'Unsupported tool' }, 400);
      const artifactType = textValue(input.artifactType, 100);
      const artifactId = textValue(input.artifactId, 200);
      if (!artifactType || !artifactId) return json({ error: 'Artifact type and id are required' }, 400);
      if (artifactType !== ARTIFACT_TYPES[tool]) return json({ error: 'Artifact type does not match this tool contract' }, 400);

      const clientQualityChecks = recordValue(input.qualityChecks) as Record<string, boolean | number | string | null>;
      const authoritativeChecks = await loadAuthoritativeChecks(supabase, user.id, tool, artifactId);
      const qualityChecks = { ...clientQualityChecks, ...authoritativeChecks };
      const verificationMode: VerificationMode = tool === 'icp_builder' && authoritativeChecks.five_interview_signals === true
        ? 'corroborated'
        : tool === 'demo_studio' && authoritativeChecks.external_activity === true
          ? 'platform_verified'
          : tool === 'pmf_lab' && authoritativeChecks.decision_grade === true
            ? 'corroborated'
            : tool === 'mvp_builder' && authoritativeChecks.evidence_manifest_approved === true
              ? 'corroborated'
              : tool === 'gtm_strategist' && authoritativeChecks.traction_sprint_created === true
                ? 'platform_verified'
                : tool === 'traction_engine' && authoritativeChecks.three_verified_weeks === true
                  ? 'platform_verified'
                  : tool === 'traction_engine' || tool === 'pmf_lab'
                    ? 'founder_reported'
                    : 'unverified';
      const evaluation = evaluateOutcomeContract({ tool, qualityChecks, verificationMode });
      const now = new Date().toISOString();
      const requestedManifest = recordValue(input.evidenceManifest);
      const requestedSources = arrayValue(requestedManifest.sources).map(recordValue);
      const { data: pendingHandoffs, error: pendingError } = await supabase.from('journey_handoffs')
        .select('id,source_outcome_id,source_version_id').eq('user_id', user.id)
        .eq('destination_tool', tool).eq('status', 'pending');
      if (pendingError) throw pendingError;
      const sourceOutcomeIds = [...new Set((pendingHandoffs ?? []).map((handoff) => handoff.source_outcome_id))];
      const sourceVersionIds = [...new Set((pendingHandoffs ?? []).map((handoff) => handoff.source_version_id))];
      const { data: sourceOutcomes } = sourceOutcomeIds.length
        ? await supabase.from('journey_outcomes').select('id,tool,artifact_type,artifact_id').eq('user_id', user.id).in('id', sourceOutcomeIds)
        : { data: [] };
      const { data: sourceVersions } = sourceVersionIds.length
        ? await supabase.from('journey_outcome_versions')
          .select('id,journey_outcome_id,completion_score,verification_mode,created_at').eq('user_id', user.id).in('id', sourceVersionIds)
        : { data: [] };
      const outcomesById = new Map((sourceOutcomes ?? []).map((outcome) => [outcome.id, outcome]));
      const versionsById = new Map((sourceVersions ?? []).map((version) => [version.id, version]));
      const restoredSources = (pendingHandoffs ?? []).flatMap((handoff) => {
        const outcome = outcomesById.get(handoff.source_outcome_id);
        const version = versionsById.get(handoff.source_version_id);
        if (!outcome || !version) return [];
        return [{
          sourceId: outcome.artifact_id,
          sourceType: outcome.artifact_type,
          artifactType: outcome.artifact_type,
          artifactId: outcome.artifact_id,
          version: version.id,
          capturedAt: version.created_at,
          confidence: version.completion_score === null ? null : Number(version.completion_score) / 100,
          provenance: `journey_handoff:${outcome.tool}`,
          verificationMode: version.verification_mode,
          label: `${outcome.tool} ${outcome.artifact_type}`,
        }];
      });
      const evidenceSources = Array.from(new Map(
        [...requestedSources, ...restoredSources].map((source) => [
          `${textValue(source.artifactId, 200) || textValue(source.sourceId, 200)}:${textValue(source.version, 100)}`,
          source,
        ]),
      ).values());
      const evidenceManifest = { version: 2, generatedAt: now, sources: evidenceSources };
      const payload = {
        user_id: user.id,
        tool,
        stage: STAGES[tool],
        artifact_type: artifactType,
        artifact_id: artifactId,
        status: evaluation.status,
        quality_checks: { ...qualityChecks, _evaluation: evaluation },
        evidence_manifest: evidenceManifest,
        completion_score: evaluation.completionScore,
        evaluation_version: evaluation.evaluatorVersion,
        verification_mode: evaluation.verificationMode,
        last_evaluated_at: now,
        completed_at: evaluation.status === 'draft' ? null : now,
        verified_at: evaluation.status === 'verified' ? now : null,
        reviewed_at: null,
        updated_at: now,
      };
      const { data, error } = await supabase.from('journey_outcomes').upsert(payload, {
        onConflict: 'user_id,tool,artifact_type,artifact_id',
      }).select('*').single();
      if (error) throw error;
      let restoredHandoffs: unknown[] = [];
      const pendingIds = (pendingHandoffs ?? []).map((handoff) => handoff.id);
      if (pendingIds.length > 0) {
        const { data: consumed, error: consumeError } = await supabase.from('journey_handoffs').update({
          status: 'consumed', consumed_artifact_id: artifactId, consumed_at: now, failure_reason: null,
        }).eq('user_id', user.id).eq('status', 'pending').in('id', pendingIds).select('*');
        if (consumeError) throw consumeError;
        restoredHandoffs = consumed ?? [];
      }
      return json({ ok: true, outcome: data, evaluation, restoredHandoffs });
    }

    if (action === 'create_handoff') {
      const sourceOutcomeId = textValue(body.sourceOutcomeId, 100);
      const destinationTool = textValue(body.destinationTool, 40) as JourneyTool;
      const idempotencyKey = textValue(body.idempotencyKey, 200);
      if (!sourceOutcomeId || !TOOLS.has(destinationTool) || !idempotencyKey) {
        return json({ error: 'Source outcome, destination tool, and idempotency key are required' }, 400);
      }
      const { data: outcome, error: outcomeError } = await supabase.from('journey_outcomes')
        .select('id,status,tool').eq('id', sourceOutcomeId).eq('user_id', user.id).single();
      if (outcomeError || !outcome) return json({ error: 'Source outcome was not found' }, 404);
      if (!['ready', 'verified', 'reviewed'].includes(outcome.status)) {
        return json({ error: 'Complete the source outcome before handing it to the next tool' }, 409);
      }
      if (!HANDOFF_DESTINATIONS[outcome.tool as JourneyTool]?.includes(destinationTool)) {
        return json({ error: 'This destination is not valid for the source tool contract' }, 400);
      }
      const { data: version, error: versionError } = await supabase.from('journey_outcome_versions')
        .select('id').eq('journey_outcome_id', outcome.id).order('version_number', { ascending: false }).limit(1).single();
      if (versionError || !version) throw versionError ?? new Error('Outcome version is unavailable');
      const { data, error } = await supabase.from('journey_handoffs').upsert({
        user_id: user.id,
        source_outcome_id: outcome.id,
        source_version_id: version.id,
        destination_tool: destinationTool,
        payload: recordValue(body.payload),
        idempotency_key: idempotencyKey,
      }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: false }).select('*').single();
      if (error) throw error;
      return json({ ok: true, handoff: data });
    }

    if (action === 'consume_handoff') {
      const handoffId = textValue(body.handoffId, 100);
      const artifactId = textValue(body.artifactId, 200);
      if (!handoffId || !artifactId) return json({ error: 'Handoff and artifact ids are required' }, 400);
      const { data, error } = await supabase.from('journey_handoffs').update({
        status: 'consumed', consumed_artifact_id: artifactId, consumed_at: new Date().toISOString(), failure_reason: null,
      }).eq('id', handoffId).eq('user_id', user.id).select('*').single();
      if (error) throw error;
      return json({ ok: true, handoff: data });
    }

    return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    console.error('journey-outcome-service error', error);
    return json({ error: error instanceof Error ? error.message : 'Outcome service failed' }, 500);
  }
});

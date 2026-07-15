import type { ICPAnalysis } from '@/components/icp/types';
import type { PMFReadinessAnalysis } from '@/hooks/usePMFLab';
import type { GTMAnalysis } from '@/hooks/useGTMStrategist';
import { isGTMPlanV2, type GTMPlanV2 } from '@/lib/gtmV2';
import { supabase } from '@/integrations/supabase/client';

const SHARED_OUTPUTS_TABLE = 'bizmap_shared_outputs' as any;

export type BizMapShareSourceType = 'icp' | 'pmf' | 'gtm';
export type BizMapShareVisibility = 'private' | 'unlisted' | 'public';

export interface ICPSharedSnapshot {
  generatedAt: string;
  recommendation: {
    primaryIcp: string;
    whyThisIcp: string;
    problemToWin: string;
    valueWedge: string;
    confidence: ICPAnalysis['recommendation']['confidence'];
    confidenceReason: string;
    evidenceSignals: string[];
    openQuestions: string[];
  };
  customerProfile: {
    buyer: string;
    user: string;
    organizationContext: string;
    triggerMoments: string[];
    channels: string[];
  };
  positioning: {
    oneLiner: string;
    valueProposition: string;
    differentiators: string[];
    proofPoints: string[];
  };
  validationPlan: {
    verdict: ICPAnalysis['validationPlan']['verdict'];
    overallScore: number;
    immediateGoal: string;
    experiments: Array<{
      priority: 'High' | 'Medium' | 'Low';
      hypothesis: string;
      test: string;
      successSignal: string;
      timeToRun: string;
    }>;
  };
}

export interface PMFSharedSnapshot {
  generatedAt: string;
  overallScore: number;
  verdict: PMFReadinessAnalysis['verdict'];
  verdictLabel: string;
  summaryInsight: string;
  scoreMeaning?: string;
  strengths: string[];
  gaps: string[];
  buyingSignals: string[];
  commonObjections: string[];
  missingFeatures: string[];
  recommendations: Array<{
    priority: 'critical' | 'important' | 'nice';
    title: string;
    action: string;
    timeframe: string;
  }>;
  nextExperiment?: string;
}

export interface GTMSharedSnapshot {
  generatedAt: string;
  planTitle: string;
  summaryInsight: string;
  positioning: {
    positioningStatement: string;
    uniqueValueProposition: string;
    keyDifferentiators: string[];
  };
  messaging: {
    headline: string;
    hookLine: string;
    proofPoint: string;
    ctaCopy: string;
  };
  channels: Array<{
    channel: string;
    fitScore: number;
    fitReason: string;
    weekOneActions: string[];
    doNotDo: string[];
  }>;
  actionPlan: GTMAnalysis['actionPlan'];
  metrics: GTMAnalysis['metrics'];
  targetAudience?: string;
}

export type BizMapSharedSnapshot = ICPSharedSnapshot | PMFSharedSnapshot | GTMSharedSnapshot;

export interface BizMapSharedOutputRecord {
  id: string;
  user_id: string;
  source_type: BizMapShareSourceType;
  source_id: string;
  slug: string;
  title: string;
  summary: string;
  snapshot: BizMapSharedSnapshot;
  visibility: BizMapShareVisibility;
  created_at: string;
  updated_at: string;
  published_at: string;
}

interface UpsertBizMapSharedOutputArgs {
  userId: string;
  sourceType: BizMapShareSourceType;
  sourceId: string;
  title: string;
  summary: string;
  snapshot: BizMapSharedSnapshot;
  preferredVisibility?: Extract<BizMapShareVisibility, 'unlisted' | 'public'>;
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function createRandomSuffix() {
  return crypto.randomUUID().slice(0, 8);
}

function createShareSlug(sourceType: BizMapShareSourceType, title: string) {
  const typePrefix = sourceType === 'icp' ? 'icp' : sourceType === 'pmf' ? 'pmf' : 'gtm';
  const base = sanitizeSegment(title) || `${typePrefix}-brief`;
  return `${typePrefix}-${base}-${createRandomSuffix()}`;
}

function getSourceLabel(sourceType: BizMapShareSourceType) {
  switch (sourceType) {
    case 'icp':
      return 'ICP Builder';
    case 'pmf':
      return 'PMF Lab';
    case 'gtm':
      return 'GTM Strategist';
    default:
      return 'BizMap AI';
  }
}

export function createICPSharedPayload(analysis: ICPAnalysis) {
  const title = `ICP Builder Snapshot: ${analysis.recommendation.primaryIcp}`;
  const summary = `A focused ICP recommendation for ${analysis.recommendation.primaryIcp}, including the strongest wedge, customer triggers, and validation experiments.`;
  const snapshot: ICPSharedSnapshot = {
    generatedAt: new Date().toISOString(),
    recommendation: {
      primaryIcp: analysis.recommendation.primaryIcp,
      whyThisIcp: analysis.recommendation.whyThisIcp,
      problemToWin: analysis.recommendation.problemToWin,
      valueWedge: analysis.recommendation.valueWedge,
      confidence: analysis.recommendation.confidence,
      confidenceReason: analysis.recommendation.confidenceReason,
      evidenceSignals: analysis.recommendation.evidenceSignals,
      openQuestions: analysis.recommendation.openQuestions,
    },
    customerProfile: {
      buyer: analysis.customerProfile.buyer,
      user: analysis.customerProfile.user,
      organizationContext: analysis.customerProfile.organizationContext,
      triggerMoments: analysis.customerProfile.triggerMoments,
      channels: analysis.customerProfile.channels,
    },
    positioning: {
      oneLiner: analysis.positioning.oneLiner,
      valueProposition: analysis.positioning.valueProposition,
      differentiators: analysis.positioning.differentiators,
      proofPoints: analysis.positioning.proofPoints,
    },
    validationPlan: {
      verdict: analysis.validationPlan.verdict,
      overallScore: analysis.validationPlan.overallScore,
      immediateGoal: analysis.validationPlan.immediateGoal,
      experiments: analysis.validationPlan.experiments,
    },
  };

  return { title, summary, snapshot };
}

export function createPMFSharedPayload(analysis: PMFReadinessAnalysis) {
  const title = `PMF Readiness Report: ${analysis.overallScore}/100`;
  const summary = `${analysis.verdictLabel} with a PMF score of ${analysis.overallScore}/100, plus the strongest buying signals, missing proof, and next experiments.`;
  const snapshot: PMFSharedSnapshot = {
    generatedAt: analysis.generatedAt || new Date().toISOString(),
    overallScore: analysis.overallScore,
    verdict: analysis.verdict,
    verdictLabel: analysis.verdictLabel,
    summaryInsight: analysis.summaryInsight,
    scoreMeaning: analysis.scoreMeaning,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    buyingSignals: analysis.buyingSignals ?? [],
    commonObjections: analysis.commonObjections ?? [],
    missingFeatures: analysis.missingFeatures ?? [],
    recommendations: analysis.recommendations,
    nextExperiment: analysis.nextExperiment,
  };

  return { title, summary, snapshot };
}

export function createGTMSharedPayload(analysis: GTMAnalysis | GTMPlanV2) {
  if (isGTMPlanV2(analysis)) {
    const activeWeeks = analysis.sixWeekPlan;
    const title = analysis.planTitle;
    const summary = `${analysis.summaryInsight} Includes an evidence-grounded GTM motion, focused channel plays, and a six-week execution plan.`;
    const snapshot: GTMSharedSnapshot = {
      generatedAt: analysis.generatedAt || new Date().toISOString(),
      planTitle: title,
      summaryInsight: analysis.summaryInsight,
      positioning: {
        positioningStatement: analysis.positioning.positioningStatement,
        uniqueValueProposition: analysis.positioning.uniqueValueProposition,
        keyDifferentiators: analysis.positioning.keyDifferentiators,
      },
      messaging: analysis.messaging,
      channels: analysis.channels.map((channel) => ({
        channel: channel.name,
        fitScore: Math.round(channel.score / 10),
        fitReason: channel.rationale,
        weekOneActions: analysis.plays.find((play) => play.channelId === channel.id)?.actions.slice(0, 3) ?? [],
        doNotDo: channel.rejectionReason ? [channel.rejectionReason] : [],
      })),
      actionPlan: {
        week1: activeWeeks.find((week) => week.week === 1)?.actions ?? [],
        week2: activeWeeks.find((week) => week.week === 2)?.actions ?? [],
        weeks3to4: activeWeeks.filter((week) => week.week >= 3 && week.week <= 4).flatMap((week) => week.actions),
      },
      metrics: {
        primary: analysis.metrics.leading.map((metric) => ({
          name: metric.name,
          target: metric.target,
          why: `Leading evidence for ${analysis.metrics.primaryOutcome}`,
          howToMeasure: metric.howToMeasure,
        })),
        laggingIndicators: analysis.metrics.lagging,
      },
      targetAudience: analysis.intake.targetSegment,
    };
    return { title, summary, snapshot };
  }

  const title = analysis.planTitle;
  const summary = `${analysis.summaryInsight} Includes channel recommendations, positioning, messaging, and the first 30 days of launch actions.`;
  const snapshot: GTMSharedSnapshot = {
    generatedAt: analysis.generatedAt || new Date().toISOString(),
    planTitle: analysis.planTitle,
    summaryInsight: analysis.summaryInsight,
    positioning: analysis.positioning,
    messaging: analysis.messaging,
    channels: analysis.channels.map((channel) => ({
      channel: channel.channel,
      fitScore: channel.fitScore,
      fitReason: channel.fitReason,
      weekOneActions: channel.weekOneActions,
      doNotDo: channel.doNotDo,
    })),
    actionPlan: analysis.actionPlan,
    metrics: analysis.metrics,
    targetAudience: analysis.intakeAnswers?.targetAudience,
  };

  return { title, summary, snapshot };
}

export async function getBizMapSharedOutputBySource(
  userId: string,
  sourceType: BizMapShareSourceType,
  sourceId: string,
) {
  const { data, error } = await (supabase as any)
    .from(SHARED_OUTPUTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BizMapSharedOutputRecord | null;
}

export async function upsertBizMapSharedOutput({
  userId,
  sourceType,
  sourceId,
  title,
  summary,
  snapshot,
  preferredVisibility = 'unlisted',
}: UpsertBizMapSharedOutputArgs) {
  const existing = await getBizMapSharedOutputBySource(userId, sourceType, sourceId);

  if (existing) {
    const { data, error } = await (supabase as any)
      .from(SHARED_OUTPUTS_TABLE)
      .update({
        title,
        summary,
        snapshot,
        visibility: existing.visibility === 'private' ? preferredVisibility : existing.visibility,
        published_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return { record: data as BizMapSharedOutputRecord, created: false };
  }

  const { data, error } = await (supabase as any)
    .from(SHARED_OUTPUTS_TABLE)
    .insert({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      slug: createShareSlug(sourceType, title),
      title,
      summary,
      snapshot,
      visibility: preferredVisibility,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return { record: data as BizMapSharedOutputRecord, created: true };
}

export async function updateBizMapSharedOutputVisibility(
  id: string,
  userId: string,
  visibility: BizMapShareVisibility,
) {
  const { data, error } = await (supabase as any)
    .from(SHARED_OUTPUTS_TABLE)
    .update({ visibility })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as BizMapSharedOutputRecord;
}

export async function regenerateBizMapSharedOutputSlug(
  id: string,
  userId: string,
  sourceType: BizMapShareSourceType,
  title: string,
) {
  const { data, error } = await (supabase as any)
    .from(SHARED_OUTPUTS_TABLE)
    .update({
      slug: createShareSlug(sourceType, title),
      visibility: 'unlisted',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as BizMapSharedOutputRecord;
}

export async function getBizMapSharedOutputBySlug(slug: string) {
  const { data, error } = await (supabase as any)
    .from(SHARED_OUTPUTS_TABLE)
    .select('*')
    .eq('slug', slug)
    .in('visibility', ['unlisted', 'public'])
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BizMapSharedOutputRecord | null;
}

export function getBizMapShareUrl(slug: string) {
  return `${window.location.origin}/share/${slug}`;
}

export function getBizMapShareDescription(record: Pick<BizMapSharedOutputRecord, 'source_type' | 'summary'>) {
  return `${record.summary} Shared from ${getSourceLabel(record.source_type)} on Creatives Takeover.`;
}

export function getBizMapLinkedInPostText(record: Pick<BizMapSharedOutputRecord, 'title' | 'summary' | 'source_type' | 'slug'>) {
  const url = getBizMapShareUrl(record.slug);
  return `${record.title}\n\n${record.summary}\n\nBuilt with ${getSourceLabel(record.source_type)} on Creatives Takeover.\n${url}`;
}

export function getBizMapLinkedInShareUrl(slug: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getBizMapShareUrl(slug))}`;
}

export function isICPSharedSnapshot(snapshot: BizMapSharedSnapshot): snapshot is ICPSharedSnapshot {
  return 'recommendation' in snapshot && 'validationPlan' in snapshot;
}

export function isPMFSharedSnapshot(snapshot: BizMapSharedSnapshot): snapshot is PMFSharedSnapshot {
  return 'overallScore' in snapshot && 'verdictLabel' in snapshot && 'recommendations' in snapshot;
}

export function isGTMSharedSnapshot(snapshot: BizMapSharedSnapshot): snapshot is GTMSharedSnapshot {
  return 'planTitle' in snapshot && 'channels' in snapshot && 'actionPlan' in snapshot;
}

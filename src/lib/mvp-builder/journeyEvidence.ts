// Journey-context compiler: assembles the founder's validated evidence (ICP
// draft, PMF readiness analysis, GTM plan) into a build brief for MVP Builder.
// This is the reason to build here instead of a blank-prompt tool — the MVP's
// feature list, copy, and audience come from scored evidence, not a guess.
import { supabase } from '@/integrations/supabase/client';
import {
  createJourneyEvidenceManifest,
  type JourneyEvidenceManifest,
  type JourneyEvidenceSource,
} from '@/lib/journeyOutcomes';

export interface JourneyEvidenceBrief {
  brief: string;
  sources: { icp: boolean; demo: boolean; pmf: boolean; gtm: boolean };
  manifest: JourneyEvidenceManifest;
  scope: {
    coreCustomer: string;
    coreJob: string;
    successEvent: string;
    essentialFeatures: string[];
  };
}

type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const asTextList = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, max)
    : [];

const bulletList = (items: string[]): string => items.map((item) => `- ${item}`).join('\n');

export async function fetchJourneyEvidenceBrief(userId: string): Promise<JourneyEvidenceBrief | null> {
  const [icpRes, demoRes, pmfRes, gtmRes, outcomesRes] = await Promise.all([
    supabase
      .from('icp_analysis_results' as never)
      .select('id, target_audience, business_description, analysis_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('demo_studio_projects' as never)
      .select('id, name, tagline, category, launch_published, created_at, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pmf_analysis_results' as never)
      .select('id, pmf_score, analysis_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gtm_plans' as never)
      .select('id, plan_title, plan_content, version, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('journey_outcomes' as never)
      .select('tool,status,artifact_id')
      .eq('user_id', userId)
      .in('status', ['ready', 'verified', 'reviewed']),
  ]);

  const icp = asRecord(icpRes.data);
  const demo = asRecord(demoRes.data);
  const pmf = asRecord(pmfRes.data);
  const gtm = asRecord(gtmRes.data);
  const readyTools = new Set(
    ((outcomesRes.data ?? []) as Array<{ tool: string; status: string }>).map((outcome) => outcome.tool),
  );

  const sections: string[] = [];
  const sources = { icp: false, demo: false, pmf: false, gtm: false };
  const manifestSources: JourneyEvidenceSource[] = [];

  // ── ICP: who it's for ──────────────────────────────────────────────────────
  const icpData = asRecord(icp.analysis_data);
  const draftDoc = asRecord(icpData.draftDocument);
  const customer = asRecord(draftDoc.customer);
  const pain = asRecord(draftDoc.pain);
  const decisionBrief = asRecord(draftDoc.decisionBrief);
  const roleLine = asText(customer.roleLine) || asText(icp.target_audience);
  const painQuote = asText(pain.quote);
  const businessDescription = asText(icp.business_description);
  if (readyTools.has('icp_builder') && (roleLine || painQuote || businessDescription)) {
    sources.icp = true;
    const lines = [
      asText(decisionBrief.primarySegment) ? `- Primary customer: ${asText(decisionBrief.primarySegment)}` : roleLine ? `- Target customer: ${roleLine}` : null,
      asText(decisionBrief.nonFitSegment) ? `- Do not build for first: ${asText(decisionBrief.nonFitSegment)}` : null,
      businessDescription ? `- Product context: ${businessDescription}` : null,
      painQuote ? `- Core pain (their words): "${painQuote}"` : null,
      asText(decisionBrief.buyingTrigger) ? `- Buying trigger: ${asText(decisionBrief.buyingTrigger)}` : null,
      asText(decisionBrief.currentAlternative) ? `- Current alternative: ${asText(decisionBrief.currentAlternative)}` : null,
    ].filter(Boolean);
    sections.push(`WHO IT'S FOR (from my ICP draft):\n${lines.join('\n')}`);
    manifestSources.push({
      sourceId: asText(icp.id) || 'latest_icp',
      sourceType: 'customer_decision_brief',
      version: asText(icpData.version) || '1',
      capturedAt: asText(icpData.generatedAt) || asText(icp.created_at) || new Date().toISOString(),
      confidence: null,
      provenance: 'icp_analysis_results',
      label: roleLine || 'Latest ICP decision',
    });
  }

  // ── Demo: proof already shown to visitors ──────────────────────────────────
  const demoName = asText(demo.name);
  const demoTagline = asText(demo.tagline);
  if (readyTools.has('demo_studio') && (demoName || demoTagline)) {
    sources.demo = true;
    sections.push([
      'PROOF ALREADY SHOWN (from Demo Studio):',
      demoName ? `- Product story: ${demoName}` : null,
      demoTagline ? `- Promise tested: ${demoTagline}` : null,
      `- Publication state: ${demo.launch_published === true ? 'published' : 'draft'}`,
    ].filter(Boolean).join('\n'));
    manifestSources.push({
      sourceId: asText(demo.id) || 'latest_demo',
      sourceType: 'interactive_proof_page',
      version: '1',
      capturedAt: asText(demo.updated_at) || asText(demo.created_at) || new Date().toISOString(),
      confidence: null,
      provenance: 'demo_studio_projects',
      label: demoName || 'Latest Demo Studio proof',
    });
  }

  // ── PMF: what validation demands ───────────────────────────────────────────
  const pmfData = asRecord(pmf.analysis_data);
  const missingFeatures = asTextList(pmfData.missingFeatures, 6);
  const objections = asTextList(pmfData.commonObjections, 4);
  const buyingSignals = asTextList(pmfData.buyingSignals, 4);
  const pmfScore = typeof pmf.pmf_score === 'number' ? pmf.pmf_score : null;
  const verdictLabel = asText(pmfData.verdictLabel);
  const decision = asText(pmfData.decision);
  const evidenceGrade = asText(pmfData.evidenceGrade);
  if (readyTools.has('pmf_lab') && (missingFeatures.length || objections.length || buyingSignals.length)) {
    sources.pmf = true;
    const header = pmfScore !== null
      ? `WHAT VALIDATION SAYS (PMF score ${pmfScore}/100${verdictLabel ? ` — ${verdictLabel}` : ''}):`
      : 'WHAT VALIDATION SAYS (from my PMF evidence):';
    const parts = [
      missingFeatures.length ? `Must-have features named by real prospects:\n${bulletList(missingFeatures)}` : null,
      objections.length ? `Objections the UX must answer:\n${bulletList(objections)}` : null,
      buyingSignals.length ? `Demand signals to reinforce:\n${bulletList(buyingSignals)}` : null,
      decision ? `Product decision: ${decision}${evidenceGrade ? ` (${evidenceGrade.replace('_', ' ')})` : ''}` : null,
    ].filter(Boolean);
    sections.push(`${header}\n${parts.join('\n')}`);
    manifestSources.push({
      sourceId: asText(pmf.id) || 'latest_pmf',
      sourceType: 'pmf_decision_report',
      version: '1',
      capturedAt: asText(pmfData.generatedAt) || asText(pmf.created_at) || new Date().toISOString(),
      confidence: evidenceGrade === 'decision_grade' ? 0.9 : evidenceGrade === 'emerging' ? 0.7 : 0.5,
      provenance: 'pmf_analysis_results',
      label: decision ? `${decision} PMF decision` : 'Latest PMF report',
    });
  }

  // ── GTM: positioning and copy ──────────────────────────────────────────────
  const planContent = asRecord(gtm.plan_content);
  const positioning = asRecord(planContent.positioning);
  const messaging = asRecord(planContent.messaging);
  const positioningStatement = asText(positioning.positioningStatement);
  const headline = asText(messaging.headline);
  const hookLine = asText(messaging.hookLine);
  const ctaCopy = asText(messaging.ctaCopy);
  if (readyTools.has('gtm_strategist') && (positioningStatement || headline)) {
    sources.gtm = true;
    const lines = [
      positioningStatement ? `- Positioning: ${positioningStatement}` : null,
      headline ? `- Landing headline: "${headline}"` : null,
      hookLine ? `- Hook: "${hookLine}"` : null,
      ctaCopy ? `- CTA label: "${ctaCopy}"` : null,
    ].filter(Boolean);
    sections.push(`POSITIONING & COPY (from my GTM plan):\n${lines.join('\n')}`);
    manifestSources.push({
      sourceId: asText(gtm.id) || 'latest_gtm',
      sourceType: 'gtm_acquisition_play',
      version: String(gtm.version ?? '1'),
      capturedAt: asText(gtm.updated_at) || asText(gtm.created_at) || new Date().toISOString(),
      confidence: null,
      provenance: 'gtm_plans',
      label: asText(gtm.plan_title) || 'Latest GTM plan',
    });
  }

  if (sections.length === 0) return null;

  const manifest = createJourneyEvidenceManifest(manifestSources);
  const coreCustomer = asText(decisionBrief.primarySegment) || roleLine || 'Primary customer from the evidence manifest';
  const coreJob = painQuote || asText(pmfData.nextExperiment) || 'Complete the workflow that resolves the validated pain';
  const successEvent = buyingSignals[0] || 'Customer completes the primary workflow';
  const essentialFeatures = missingFeatures.slice(0, 3);
  const brief = [
    'Build my MVP from my validated evidence below.',
    ...sections,
    `EVIDENCE MANIFEST:\n${manifest.sources.map((source) => `- ${source.sourceType}: ${source.label || source.sourceId} | version ${source.version} | ${source.capturedAt}`).join('\n')}`,
    'BUILD THIS:\nA focused MVP for the audience above. Treat the must-have features as the core flows, design the UX to answer the top objection directly, and use the approved positioning copy on the landing or home screen. Keep scope tight: only what the evidence justifies. Preserve analytics, rollback support, and one testable primary customer flow.',
  ].join('\n\n');

  return {
    brief,
    sources,
    manifest,
    scope: {
      coreCustomer,
      coreJob,
      successEvent,
      essentialFeatures: essentialFeatures.length > 0 ? essentialFeatures : ['Primary customer workflow'],
    },
  };
}

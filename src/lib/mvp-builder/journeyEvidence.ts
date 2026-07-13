// Journey-context compiler: assembles the founder's validated evidence (ICP
// draft, PMF readiness analysis, GTM plan) into a build brief for MVP Builder.
// This is the reason to build here instead of a blank-prompt tool — the MVP's
// feature list, copy, and audience come from scored evidence, not a guess.
import { supabase } from '@/integrations/supabase/client';

export interface JourneyEvidenceBrief {
  brief: string;
  sources: { icp: boolean; pmf: boolean; gtm: boolean };
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
  const [icpRes, pmfRes, gtmRes] = await Promise.all([
    supabase
      .from('icp_analysis_results' as never)
      .select('target_audience, business_description, analysis_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pmf_analysis_results' as never)
      .select('pmf_score, analysis_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gtm_plans' as never)
      .select('plan_title, plan_content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const icp = asRecord(icpRes.data);
  const pmf = asRecord(pmfRes.data);
  const gtm = asRecord(gtmRes.data);

  const sections: string[] = [];
  const sources = { icp: false, pmf: false, gtm: false };

  // ── ICP: who it's for ──────────────────────────────────────────────────────
  const icpData = asRecord(icp.analysis_data);
  const draftDoc = asRecord(icpData.draftDocument);
  const customer = asRecord(draftDoc.customer);
  const pain = asRecord(draftDoc.pain);
  const roleLine = asText(customer.roleLine) || asText(icp.target_audience);
  const painQuote = asText(pain.quote);
  const businessDescription = asText(icp.business_description);
  if (roleLine || painQuote || businessDescription) {
    sources.icp = true;
    const lines = [
      roleLine ? `- Target customer: ${roleLine}` : null,
      businessDescription ? `- Product context: ${businessDescription}` : null,
      painQuote ? `- Core pain (their words): "${painQuote}"` : null,
    ].filter(Boolean);
    sections.push(`WHO IT'S FOR (from my ICP draft):\n${lines.join('\n')}`);
  }

  // ── PMF: what validation demands ───────────────────────────────────────────
  const pmfData = asRecord(pmf.analysis_data);
  const missingFeatures = asTextList(pmfData.missingFeatures, 6);
  const objections = asTextList(pmfData.commonObjections, 4);
  const buyingSignals = asTextList(pmfData.buyingSignals, 4);
  const pmfScore = typeof pmf.pmf_score === 'number' ? pmf.pmf_score : null;
  const verdictLabel = asText(pmfData.verdictLabel);
  if (missingFeatures.length || objections.length || buyingSignals.length) {
    sources.pmf = true;
    const header = pmfScore !== null
      ? `WHAT VALIDATION SAYS (PMF score ${pmfScore}/100${verdictLabel ? ` — ${verdictLabel}` : ''}):`
      : 'WHAT VALIDATION SAYS (from my PMF evidence):';
    const parts = [
      missingFeatures.length ? `Must-have features named by real prospects:\n${bulletList(missingFeatures)}` : null,
      objections.length ? `Objections the UX must answer:\n${bulletList(objections)}` : null,
      buyingSignals.length ? `Demand signals to reinforce:\n${bulletList(buyingSignals)}` : null,
    ].filter(Boolean);
    sections.push(`${header}\n${parts.join('\n')}`);
  }

  // ── GTM: positioning and copy ──────────────────────────────────────────────
  const planContent = asRecord(gtm.plan_content);
  const positioning = asRecord(planContent.positioning);
  const messaging = asRecord(planContent.messaging);
  const positioningStatement = asText(positioning.positioningStatement);
  const headline = asText(messaging.headline);
  const hookLine = asText(messaging.hookLine);
  const ctaCopy = asText(messaging.ctaCopy);
  if (positioningStatement || headline) {
    sources.gtm = true;
    const lines = [
      positioningStatement ? `- Positioning: ${positioningStatement}` : null,
      headline ? `- Landing headline: "${headline}"` : null,
      hookLine ? `- Hook: "${hookLine}"` : null,
      ctaCopy ? `- CTA label: "${ctaCopy}"` : null,
    ].filter(Boolean);
    sections.push(`POSITIONING & COPY (from my GTM plan):\n${lines.join('\n')}`);
  }

  if (sections.length === 0) return null;

  const brief = [
    'Build my MVP from my validated evidence below.',
    ...sections,
    'BUILD THIS:\nA focused MVP for the audience above. Treat the must-have features as the core flows, design the UX to answer the top objection directly, and use the positioning copy verbatim on the landing/home screen. Keep scope tight: only what the evidence justifies.',
  ].join('\n\n');

  return { brief, sources };
}

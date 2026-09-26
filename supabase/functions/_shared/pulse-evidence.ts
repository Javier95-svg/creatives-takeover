type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const get = (value: unknown, path: string): unknown => path.split('.').reduce<unknown>((part, key) => object(part)[key], value);
const first = (...values: unknown[]) => values.find(value => value !== undefined && value !== null && value !== '');
const pick = (value: unknown, keys: string[]) => Object.fromEntries(keys.filter(key => get(value, key) !== undefined).map(key => [key, get(value, key)]));

// No inferred metrics or evidence grades. These adapters select actual stored
// fields before budgeting, so a large opening narrative cannot hide a verdict.
export function stageEvidence(stage: string, row: Data): { basis: string; fields: Data } {
  const analysis = object(row.analysis_data);
  const draft = object(first(analysis.draftDocument, get(analysis, 'artifact.draftDocument')));
  if (stage === 'icp') return { basis: 'Saved customer hypothesis; retain section provenance. A generated claim is not buyer validation.', fields: {
    buyer: Object.keys(object(draft.customer)).length ? pick(draft.customer, ['roleLine', 'summary', 'triggerContext', 'actionTrigger']) : first(row.target_audience, analysis.nicheProfile),
    sectionProvenance: Object.fromEntries(['customer', 'pain', 'build', 'pricing'].map(section => [section, pick(get(draft, `${section}.evidence`), ['provenance', 'confidence', 'sourceIds', 'missingSignalPrompt'])])),
    targetAudience: row.target_audience, businessDescription: row.business_description, verdict: row.verdict,
    pain: first(draft.pain, analysis.pain, analysis.painPoints), alternatives: first(get(draft, 'build.replaces'), draft.competition, analysis.competitors),
    pricing: draft.pricing, risks: draft.risks, experiment: draft.experiment, confidence: draft.confidence,
    legacyFindings: Object.keys(draft).length ? undefined : pick(analysis, ['nicheProfile', 'positioningStrategy', 'customerPersona', 'corePainPoint', 'valueProposition', 'recommendations', 'confidence']),
  } };
  if (stage === 'pmf') return { basis: 'Saved analysis and reported evidence; score or verdict alone does not prove observed demand.', fields: {
    decision: first(analysis.decision, row.verdict, analysis.verdictLabel, analysis.verdict, get(analysis, 'pmfScore.verdict')), score: first(row.pmf_score, analysis.overallScore, get(analysis, 'pmfScore.overall')), targetMarket: row.target_market,
    evidenceGrade: analysis.evidenceGrade, decisionProvisional: analysis.decisionProvisional, readyToScope: analysis.readyToScope,
    signalCounts: pick(analysis, ['evidenceSignalCount', 'directEvidenceSignalCount', 'independentInterviewCount']),
    diagnosis: first(analysis.summaryInsight, analysis.diagnosis), evidence: first(analysis.evidenceAssessment, analysis.evidenceSummary, analysis.evidence),
    strengths: analysis.strengths, objections: first(analysis.objections, analysis.gaps), unresolved: first(analysis.improvementsBeforeRetest, analysis.assumptions), recommendations: first(analysis.recommendedAction, analysis.recommendations),
  } };
  if (stage === 'gtm') {
    const plan = object(row.plan_content);
    return { basis: 'Acquisition plan and targets, not proof of execution or acquired customers.', fields: {
      title: row.plan_title, status: row.status, buyer: pick(plan.intake, ['targetSegment', 'buyerRole', 'buyingTrigger']),
      thesis: plan.thesis, positioning: plan.positioning,
      plays: Array.isArray(plan.plays) ? plan.plays.slice(0, 3).map(play => pick(play, ['status', 'audience', 'offer', 'channelName', 'metric', 'target', 'killRule', 'structuredKillRule'])) : undefined,
      channel: first(plan.primary_channel, plan.channels), assumptions: plan.assumptions, claims: plan.claimAttributions,
      summary: first(plan.summaryInsight, plan.summary),
    } };
  }
  if (stage === 'mvp') return { basis: 'Intended product scope plus recorded deployment status; features listed in setup are not verified delivered functionality.', fields: {
    title: row.title, type: row.project_type, deploymentStatus: row.deployment_status,
    intendedSetup: get(row.metadata, 'intendedSetup'), framework: get(row.metadata, 'framework'),
  } };
  if (stage === 'demo') return { basis: 'Recorded page publication state; publication alone is not demand validation.', fields: pick(row, ['name', 'tagline', 'category', 'launch_published']) };
  return { basis: 'Saved sprint recommendation and status; no measured results or measurement period were retrieved.', fields: pick(row, ['channel', 'status', 'summary_recommendation']) };
}

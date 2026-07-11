import type { FeatureKey, Plan } from '@/config/planPermissions';
import type { FounderBlocker, FounderStageId, ProductStatus } from '@/lib/stageDiagnostic';
import type { ActivationIntent, RetentionArtifactType } from '@/lib/retentionSystem';

export type ActivationJourneyStatus = 'active' | 'completed' | 'exited';

export interface ActivationJourneyV2 {
  journeyId: string;
  version: 2;
  recommendedIntent: ActivationIntent;
  selectedIntent: ActivationIntent;
  source: 'resume' | 'signup' | 'quiz';
  resumeUrl: string;
  startedAt: string;
  destinationViewedAt: string | null;
  firstInputAt: string | null;
  firstOutputAt: string | null;
  firstArtifactAt: string | null;
  completedAt: string | null;
  status: ActivationJourneyStatus;
}

export interface ActivationCatalogEntry {
  intent: ActivationIntent;
  toolKey: string;
  label: string;
  description: string;
  output: string;
  route: string;
  estimatedMinutes: number;
  artifactType: RetentionArtifactType;
  featureKey?: FeatureKey;
  steps: readonly [string, string, string];
}

export const ACTIVATION_CATALOG: Record<ActivationIntent, ActivationCatalogEntry> = {
  find_mentor: { intent: 'find_mentor', toolKey: 'find_mentor', label: 'Find one mentor', description: 'Create one useful founder relationship before exploring the platform.', output: 'A saved mentor or active conversation', route: '/mentorship?mentorSource=onboarding&activationIntent=find_mentor', estimatedMinutes: 5, artifactType: 'mentor_saved', steps: ['Review matches', 'Choose one mentor', 'Save or contact'] },
  build_demo: { intent: 'build_demo', toolKey: 'demo_studio', label: 'Build your first demo', description: 'Turn product context into a walkthrough you can save and share.', output: 'A saved interactive demo', route: '/demo-studio/try', estimatedMinutes: 10, artifactType: 'demo_studio_draft', featureKey: 'demo_studio', steps: ['Add product context', 'Generate the demo', 'Save the demo'] },
  run_icp: { intent: 'run_icp', toolKey: 'icp_builder', label: 'Define your first ICP', description: 'Turn your startup context into a specific early-customer recommendation.', output: 'A saved ICP analysis', route: '/icp-builder?mode=fast', estimatedMinutes: 8, artifactType: 'icp_analysis', featureKey: 'icp_builder', steps: ['Describe the startup', 'Generate the ICP', 'Save the analysis'] },
  start_validation: { intent: 'start_validation', toolKey: 'decision_sprint', label: 'Validate one idea', description: 'Score the evidence and commit to the next concrete move.', output: 'A saved validation decision', route: '/decision-sprint', estimatedMinutes: 12, artifactType: 'validation_draft', steps: ['Describe the idea', 'Score the evidence', 'Save the decision'] },
  build_mvp: { intent: 'build_mvp', toolKey: 'mvp_builder', label: 'Scope your MVP', description: 'Define the smallest build that proves the core value.', output: 'A saved MVP scope', route: '/mvp-scope', estimatedMinutes: 15, artifactType: 'mvp_scope', featureKey: 'mvp_builder', steps: ['Describe the product', 'Create the scope', 'Save the first scope'] },
  plan_gtm: { intent: 'plan_gtm', toolKey: 'gtm_strategist', label: 'Create your GTM plan', description: 'Choose the audience, channel and launch motion you will execute.', output: 'A saved go-to-market plan', route: '/go-to-market', estimatedMinutes: 15, artifactType: 'gtm_plan', featureKey: 'gtm_strategist', steps: ['Add launch context', 'Generate the plan', 'Save the plan'] },
  log_traction: { intent: 'log_traction', toolKey: 'traction_engine', label: 'Log this weekâ€™s traction', description: 'Capture one experiment and the retention signal that matters.', output: 'A saved weekly traction log', route: '/traction-engine', estimatedMinutes: 10, artifactType: 'traction_weekly_log', steps: ['Add an experiment', 'Add retention data', 'Save this week'] },
  analyze_pitch_deck: { intent: 'analyze_pitch_deck', toolKey: 'pitch_deck_analyzer', label: 'Analyze your pitch deck', description: 'Turn your current deck into a concrete fundraising improvement plan.', output: 'A saved pitch deck analysis', route: '/pitch-deck-analyzer', estimatedMinutes: 10, artifactType: 'pitch_deck_analysis', featureKey: 'pitch_deck_analyzer', steps: ['Upload the deck', 'Run the analysis', 'Save the result'] },
  unlock_pitch_deck: { intent: 'unlock_pitch_deck', toolKey: 'pitch_deck_analyzer', label: 'Resume your pitch analysis', description: 'Return to the pitch analysis you started before signup.', output: 'A saved pitch deck analysis', route: '/pitch-deck-analyzer?hydrate=1', estimatedMinutes: 5, artifactType: 'pitch_deck_analysis', featureKey: 'pitch_deck_analyzer', steps: ['Restore the deck', 'Review the analysis', 'Save the result'] },
  unlock_tech_stack: { intent: 'unlock_tech_stack', toolKey: 'tech_stack', label: 'Resume your tech stack', description: 'Restore and save the build budget you started before signup.', output: 'A saved tech stack report', route: '/tech-stack?hydrate=1', estimatedMinutes: 5, artifactType: 'tech_stack_report', featureKey: 'tech_stack', steps: ['Restore selections', 'Generate the budget', 'Save the report'] },
  unlock_insighta: { intent: 'unlock_insighta', toolKey: 'insighta_test', label: 'Finish your readiness diagnostic', description: 'Restore your answers and generate the complete diagnostic.', output: 'A saved readiness result', route: '/insighta-test?hydrate=1', estimatedMinutes: 5, artifactType: 'insighta_readiness', featureKey: 'insighta_test', steps: ['Restore answers', 'Generate the result', 'Save the result'] },
  save_mentor: { intent: 'save_mentor', toolKey: 'find_mentor', label: 'Save one mentor', description: 'Create a mentor shortlist you can return to.', output: 'A saved mentor', route: '/mentorship?mentorSource=onboarding&activationIntent=save_mentor', estimatedMinutes: 4, artifactType: 'mentor_saved', steps: ['Review matches', 'Choose one mentor', 'Save the mentor'] },
  send_message: { intent: 'send_message', toolKey: 'messages', label: 'Start one conversation', description: 'Send one useful message that can generate a reply.', output: 'An active mentor conversation', route: '/mentorship?mentorSource=onboarding&activationIntent=send_message', estimatedMinutes: 6, artifactType: 'mentor_message', steps: ['Choose a mentor', 'Write an intro', 'Send the message'] },
  book_call: { intent: 'book_call', toolKey: 'find_mentor', label: 'Book one discovery call', description: 'Schedule focused time with a relevant mentor.', output: 'A booked discovery call', route: '/mentorship?mentorSource=onboarding&activationIntent=book_call', estimatedMinutes: 8, artifactType: 'discovery_call', steps: ['Choose a mentor', 'Pick a time', 'Confirm the call'] },
};

const STAGE_FALLBACK: Record<FounderStageId, ActivationIntent> = { 1: 'run_icp', 2: 'build_demo', 3: 'start_validation', 4: 'build_mvp', 5: 'plan_gtm', 6: 'log_traction', 7: 'analyze_pitch_deck' };

export function normalizeActivationIntent(intent: unknown): ActivationIntent | null {
  if (intent === 'unlock_pitch_deck') return 'analyze_pitch_deck';
  return typeof intent === 'string' && intent in ACTIVATION_CATALOG ? intent as ActivationIntent : null;
}

function blockerIntent(blocker: FounderBlocker, productStatus: ProductStatus): ActivationIntent {
  if (blocker === 'customer_clarity') return 'run_icp';
  if (blocker === 'demand_validation') return productStatus === 'idea_only' ? 'start_validation' : 'build_demo';
  if (blocker === 'product_build') return 'build_mvp';
  if (blocker === 'go_to_market') return 'plan_gtm';
  if (blocker === 'traction_growth') return 'log_traction';
  if (blocker === 'fundraising') return 'analyze_pitch_deck';
  return 'find_mentor';
}

export interface ActivationRecommendationInput {
  assignedStage: FounderStageId;
  blocker: FounderBlocker;
  productStatus: ProductStatus;
  userPreferences?: Record<string, unknown> | null;
  availableIntents?: ActivationIntent[];
}

export interface ActivationRecommendation {
  intent: ActivationIntent;
  source: ActivationJourneyV2['source'];
  resumeUrl: string;
  reason: string;
}

export function recommendActivation(input: ActivationRecommendationInput): ActivationRecommendation {
  const prefs = input.userPreferences ?? {};
  const available = new Set(input.availableIntents?.length ? input.availableIntents : Object.keys(ACTIVATION_CATALOG) as ActivationIntent[]);
  const existingJourney = parseActivationJourney(prefs.activationJourney);
  const existingResume = existingJourney?.status === 'active'
    ? existingJourney.resumeUrl
    : typeof prefs.firstArtifactResumeUrl === 'string'
      ? prefs.firstArtifactResumeUrl
      : typeof prefs.activationReturnUrl === 'string'
        ? prefs.activationReturnUrl
        : null;
  const existingIntent = normalizeActivationIntent(existingJourney?.selectedIntent ?? prefs.activationIntent);

  if (existingResume && existingIntent && available.has(existingIntent)) {
    return { intent: existingIntent, source: 'resume', resumeUrl: existingResume, reason: 'Continue the work you started before onboarding.' };
  }
  if (existingIntent && available.has(existingIntent) && prefs.activationSource && prefs.activationSource !== 'onboarding') {
    return { intent: existingIntent, source: 'signup', resumeUrl: ACTIVATION_CATALOG[existingIntent].route, reason: 'Continue the goal that brought you here.' };
  }

  const byBlocker = blockerIntent(input.blocker, input.productStatus);
  const intent = available.has(byBlocker)
    ? byBlocker
    : available.has(STAGE_FALLBACK[input.assignedStage])
      ? STAGE_FALLBACK[input.assignedStage]
      : (['build_demo', 'run_icp', 'start_validation', 'find_mentor'] as ActivationIntent[]).find((candidate) => available.has(candidate)) ?? 'find_mentor';
  return { intent, source: 'quiz', resumeUrl: ACTIVATION_CATALOG[intent].route, reason: `Recommended for your current stage and ${input.blocker.replaceAll('_', ' ')} blocker.` };
}

export function createActivationJourney(recommendation: ActivationRecommendation, selectedIntent = recommendation.intent): ActivationJourneyV2 {
  const now = new Date().toISOString();
  const journeyId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `activation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { journeyId, version: 2, recommendedIntent: recommendation.intent, selectedIntent, source: selectedIntent === recommendation.intent ? recommendation.source : 'quiz', resumeUrl: selectedIntent === recommendation.intent ? recommendation.resumeUrl : ACTIVATION_CATALOG[selectedIntent].route, startedAt: now, destinationViewedAt: null, firstInputAt: null, firstOutputAt: null, firstArtifactAt: null, completedAt: null, status: 'active' };
}

export function parseActivationJourney(value: unknown): ActivationJourneyV2 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const selectedIntent = normalizeActivationIntent(row.selectedIntent);
  const recommendedIntent = normalizeActivationIntent(row.recommendedIntent);
  if (row.version !== 2 || typeof row.journeyId !== 'string' || !selectedIntent || !recommendedIntent || typeof row.resumeUrl !== 'string' || typeof row.startedAt !== 'string') return null;
  return { journeyId: row.journeyId, version: 2, selectedIntent, recommendedIntent, source: row.source === 'resume' || row.source === 'signup' ? row.source : 'quiz', resumeUrl: row.resumeUrl, startedAt: row.startedAt, destinationViewedAt: typeof row.destinationViewedAt === 'string' ? row.destinationViewedAt : null, firstInputAt: typeof row.firstInputAt === 'string' ? row.firstInputAt : null, firstOutputAt: typeof row.firstOutputAt === 'string' ? row.firstOutputAt : null, firstArtifactAt: typeof row.firstArtifactAt === 'string' ? row.firstArtifactAt : null, completedAt: typeof row.completedAt === 'string' ? row.completedAt : null, status: row.status === 'completed' || row.status === 'exited' ? row.status : 'active' };
}

export function buildActivationJourneyUrl(intent: ActivationIntent, journeyId: string, resumeUrl?: string) {
  const route = resumeUrl || ACTIVATION_CATALOG[intent].route;
  const separator = route.includes('?') ? '&' : '?';
  return `${route}${separator}activation=1&journey=${encodeURIComponent(journeyId)}&intent=${encodeURIComponent(intent)}`;
}

export function getStageAvailableIntents(_plan: Plan): ActivationIntent[] {
  return Object.keys(ACTIVATION_CATALOG) as ActivationIntent[];
}

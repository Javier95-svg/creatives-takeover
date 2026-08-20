import type { AssessmentScores, FounderStage } from '@/types/fundraisingAssessment';

export type InsightaReadinessRouteKey = 'traction_engine' | 'pitch_deck_analyzer' | 'vc_search' | 'accelerator_hunt';

export interface InsightaReadinessRoute {
  key: InsightaReadinessRouteKey;
  title: string;
  reason: string;
  route: string;
}

const TRACTION_KEYS: Array<keyof AssessmentScores> = ['mvp', 'feedback', 'traction', 'gtm_strategy', 'unit_economics'];
const NARRATIVE_KEYS: Array<keyof AssessmentScores> = ['founder_market_fit', 'competitive_positioning', 'team'];

function lowestScore(scores: Partial<AssessmentScores>, keys: Array<keyof AssessmentScores>): number {
  const values = keys.map((key) => scores[key]).filter((value): value is number => typeof value === 'number' && value > 0);
  return values.length ? Math.min(...values) : 10;
}

export function getInsightaReadinessRoute(input: {
  scores: Partial<AssessmentScores>;
  verdict?: 'Ready' | 'Almost Ready' | 'Not Ready' | null;
  founderStage?: FounderStage | null;
}): InsightaReadinessRoute {
  if (input.verdict === 'Ready') {
    if (input.founderStage === 'ideation' || input.founderStage === 'validation') {
      return { key: 'accelerator_hunt', title: 'Find a stage-fit accelerator', reason: 'Your diagnostic is ready enough for targeted program research, while filters remain editable.', route: '/accelerator-hunt' };
    }
    return { key: 'vc_search', title: 'Build a targeted investor list', reason: 'Your diagnostic is ready enough to research stage-, sector-, geography-, and raise-fit investors.', route: '/vc-search' };
  }

  if (lowestScore(input.scores, NARRATIVE_KEYS) < lowestScore(input.scores, TRACTION_KEYS)) {
    return { key: 'pitch_deck_analyzer', title: 'Strengthen the fundraising narrative', reason: 'Narrative and positioning are the highest-impact readiness gap in your answers.', route: '/pitch-deck-analyzer' };
  }

  return { key: 'traction_engine', title: 'Strengthen traction evidence first', reason: 'Product, customer, channel, or economics evidence is the highest-impact readiness gap in your answers.', route: '/traction-engine' };
}

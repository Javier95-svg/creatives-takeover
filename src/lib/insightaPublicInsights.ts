export interface InsightaPublicQuestionScore {
  id: string;
  title: string;
  description: string;
  score: number;
}

export interface InsightaPublicSignal extends InsightaPublicQuestionScore {
  label: 'Strong signal' | 'Critical gap' | 'Improvement priority' | 'Next leverage point';
}

export interface InsightaPublicInsights {
  strengths: InsightaPublicSignal[];
  gaps: InsightaPublicSignal[];
  nextAction: string;
  stageComparison: string;
  deltaFromThreshold: number;
}

const ACTION_BY_QUESTION: Record<string, string> = {
  founder_market_fit: 'Write three evidence-backed reasons you are unusually qualified to solve this problem, then use them in your founder story.',
  mvp: 'Put the smallest working version in front of five target users and document where they reach value or get stuck.',
  traction: 'Choose one weekly traction metric—active users, retained users, revenue, or qualified demand—and collect four consecutive weeks of evidence.',
  feedback: 'Run five problem interviews with target customers and record repeated pains, current workarounds, and willingness-to-pay language.',
  competitive_positioning: 'Build a one-page comparison against the status quo and three real alternatives, then state the narrow segment where you win.',
  gtm_strategy: 'Test one acquisition channel for two weeks with a defined audience, offer, budget, and success metric.',
  unit_economics: 'Calculate a first CAC, gross margin, and customer lifetime value estimate—even rough numbers will expose the assumption to validate next.',
  team: 'Name the single missing capability most likely to slow execution and decide whether to hire, find an advisor, or narrow the plan.',
  runway: 'Build an 18-month cash plan with a fundraising buffer and identify the month when you must begin investor outreach.',
  legal_readiness: 'Create a due-diligence folder for incorporation, cap table, IP ownership, contracts, and privacy documentation.',
  investor_network: 'Build a focused list of 20 stage-and-sector-fit investors and identify one warm path or relevant signal for each.',
};

export function buildInsightaPublicInsights({
  questions,
  averageScore,
  stageLabel,
  threshold,
  criticalMinimums = {},
}: {
  questions: InsightaPublicQuestionScore[];
  averageScore: number;
  stageLabel: string;
  threshold: number;
  criticalMinimums?: Record<string, number>;
}): InsightaPublicInsights {
  const valid = questions.filter((question) => Number.isFinite(question.score) && question.score > 0);
  const strengths = [...valid]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 2)
    .map((question) => ({ ...question, label: 'Strong signal' as const }));

  const gaps = [...valid]
    .sort((a, b) => {
      const aCriticalDeficit = Math.max(0, (criticalMinimums[a.id] ?? 0) - a.score);
      const bCriticalDeficit = Math.max(0, (criticalMinimums[b.id] ?? 0) - b.score);
      return bCriticalDeficit - aCriticalDeficit || a.score - b.score || a.title.localeCompare(b.title);
    })
    .slice(0, 2)
    .map((question) => ({
      ...question,
      label: (question.score <= 4
        ? 'Critical gap'
        : question.score <= 6
          ? 'Improvement priority'
          : 'Next leverage point') as InsightaPublicSignal['label'],
    }));

  const priorityGap = gaps[0];
  const deltaFromThreshold = Number((averageScore - threshold).toFixed(1));
  const stageComparison = deltaFromThreshold > 0
    ? `Your score is ${deltaFromThreshold.toFixed(1)} points above the ${stageLabel} readiness threshold.`
    : deltaFromThreshold < 0
      ? `Your score is ${Math.abs(deltaFromThreshold).toFixed(1)} points below the ${stageLabel} readiness threshold.`
      : `Your score meets the ${stageLabel} readiness threshold.`;

  return {
    strengths,
    gaps,
    nextAction: priorityGap
      ? ACTION_BY_QUESTION[priorityGap.id] ?? `Turn ${priorityGap.title.toLowerCase()} into your next evidence-building milestone.`
      : 'Complete the assessment to receive a prioritized evidence-building action.',
    stageComparison,
    deltaFromThreshold,
  };
}

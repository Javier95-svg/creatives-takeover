export interface ICPAnalysis {
  recommendation: {
    primaryIcp: string;
    whyThisIcp: string;
    problemToWin: string;
    valueWedge: string;
    decision: string;
    confidence: 'High' | 'Medium' | 'Low';
    confidenceReason: string;
    evidenceSignals: string[];
    doNotTargetYet: string[];
    openQuestions: string[];
  };
  customerProfile: {
    segmentName: string;
    whoTheyAre: string;
    buyer: string;
    user: string;
    organizationContext: string;
    triggerMoments: string[];
    urgencySignals: string[];
    currentAlternatives: string[];
    switchingCosts: string[];
    buyingMotion: string;
    budgetOwner: string;
    channels: string[];
  };
  painPoints: Array<{
    painPoint: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    whenItShowsUp: string;
    currentWorkaround: string;
    whyUnresolved: string;
    switchingBarrier: string;
    opportunityScore: number;
  }>;
  positioning: {
    oneLiner: string;
    positioningStatement: string;
    valueProposition: string;
    differentiators: string[];
    proofPoints: string[];
    messagePillars: string[];
    objections: Array<{
      objection: string;
      response: string;
    }>;
  };
  validationPlan: {
    immediateGoal: string;
    verdict: 'Strong Wedge' | 'Worth Testing' | 'Needs Sharper Focus';
    overallScore: number;
    scoreBreakdown: {
      pain: number;
      specificity: number;
      differentiation: number;
      reachability: number;
    };
    reasoning: string;
    experiments: Array<{
      priority: 'High' | 'Medium' | 'Low';
      hypothesis: string;
      test: string;
      successSignal: string;
      timeToRun: string;
    }>;
    milestones: string[];
  };
}

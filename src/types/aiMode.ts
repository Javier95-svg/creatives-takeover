// AI Mode Type Definitions

export type AIMode = 'strategy' | 'business' | 'research' | 'investor';

export interface ModeMetadata {
  mode: AIMode;
  currentStep?: number;
  completedSteps?: number[];
  totalSteps?: number;
  startedAt?: string;
  lastActivity?: string;
  engagementScore?: number;
}

export interface ModeTransition {
  id: string;
  userId: string | null;
  sessionId: string;
  fromMode: AIMode;
  toMode: AIMode;
  transitionReason: 'user_request' | 'auto_detection' | 'completion' | 'recommendation';
  timestamp: string;
  context?: Record<string, any>;
}

export interface ModeEngagementMetrics {
  userId: string | null;
  mode: AIMode;
  sessionCount: number;
  totalTimeMinutes: number;
  averageSessionLength: number;
  messagesPerSession: number;
  completionRate: number;
  returnRate: number;
  lastEngagement?: string;
}

export interface StrategyModeProgress {
  currentStep: number; // 0-6 (0-indexed, 7 total steps)
  completedSteps: number[]; // Array of completed step indices
  stepAnswers: Record<string, string>; // Answers for each step
  startedAt: string;
  lastStepCompletedAt?: string;
  completionStatus: 'not_started' | 'in_progress' | 'completed';
  totalTimeMinutes?: number;
}

export interface ModeAchievement {
  id: string;
  userId: string;
  mode: AIMode;
  achievementType: 
    | 'mode_mastery' 
    | 'step_completion' 
    | 'streak_day'
    | 'streak_week'
    | 'session_milestone'
    | 'completion_badge';
  unlockedAt: string;
  metadata?: {
    stepNumber?: number;
    streakDays?: number;
    sessionCount?: number;
    [key: string]: any;
  };
}

export interface ModeConfiguration {
  mode: AIMode;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  requiredForNewUsers?: boolean; // Strategy Mode is required first
  unlockCondition?: {
    type: 'completion' | 'step_threshold' | 'time_based';
    value: any;
  };
}

export const MODE_CONFIGURATIONS: Record<AIMode, ModeConfiguration> = {
  strategy: {
    mode: 'strategy',
    displayName: 'Strategy Mode',
    description: '7-step guided workshop to build your business plan',
    icon: '🎯',
    color: 'primary',
    enabled: true,
    requiredForNewUsers: true,
    unlockCondition: undefined, // Always available
  },
  business: {
    mode: 'business',
    displayName: 'Business Mode',
    description: 'Advanced business planning & validation',
    icon: '🏢',
    color: 'secondary',
    enabled: true,
    requiredForNewUsers: false,
    unlockCondition: {
      type: 'completion',
      value: 'strategy', // Unlocks after Strategy Mode completion
    },
  },
  research: {
    mode: 'research',
    displayName: 'Research Mode',
    description: 'Market research & trends analysis',
    icon: '🔍',
    color: 'accent',
    enabled: true,
    requiredForNewUsers: false,
    unlockCondition: undefined, // Available to all
  },
  investor: {
    mode: 'investor',
    displayName: 'Investor Mode',
    description: 'Fundraising & pitch preparation',
    icon: '💰',
    color: 'warning',
    enabled: true,
    requiredForNewUsers: false,
    unlockCondition: undefined, // Available to all
  },
};

// Strategy Mode Step Definitions (matching existing wizardSteps)
export interface StrategyStep {
  key: string;
  title: string;
  question: string;
  placeholder: string;
  transition: string;
  dayRange: string;
  estimatedTime: string;
  requiredFields?: string[];
}

export const STRATEGY_MODE_STEPS: StrategyStep[] = [
  {
    key: 'overview',
    title: 'Business Concept (Days 1-2)',
    question: '🚀 Let\'s build your 30-day launch plan! What problem are you solving and for whom? This becomes your validation foundation.',
    placeholder: 'Example: A mobile app that helps busy parents find and book last-minute childcare...',
    transition: 'Perfect! Now let\'s define who your first customers will be...',
    dayRange: 'Days 1-2',
    estimatedTime: '15-20 minutes',
    requiredFields: ['problem', 'target'],
  },
  {
    key: 'market',
    title: 'Target Customer (Days 3-4)',
    question: '📅 Day 3-4 Focus: Describe your ideal FIRST customer in detail. Where can we find them in the next 7 days?',
    placeholder: 'Example: Working parents aged 28-45 in urban areas, active in mom Facebook groups and parenting subreddits...',
    transition: 'Excellent! Now let\'s design your minimum viable product...',
    dayRange: 'Days 3-4',
    estimatedTime: '20-25 minutes',
    requiredFields: ['demographics', 'location', 'channels'],
  },
  {
    key: 'problem',
    title: 'Validation Plan (Days 5-7)',
    question: '📊 Validation Goal: How will you validate demand this week? List 3 ways you\'ll test if people want this.',
    placeholder: 'Example: 10 customer interviews, landing page with email signup, competitor research in 3 markets...',
    transition: 'Great validation plan! Now, what\'s the simplest version we can build?',
    dayRange: 'Days 5-7',
    estimatedTime: '25-30 minutes',
    requiredFields: ['validation_methods'],
  },
  {
    key: 'solution',
    title: 'MVP Design (Days 8-14)',
    question: '🛠️ MVP Focus: What\'s the absolute MINIMUM version that solves the core problem? What features are essential?',
    placeholder: 'Example: Simple booking form, verified sitter profiles, SMS notifications. NO fancy features yet...',
    transition: 'Perfect MVP scope! Now, where will you launch?',
    dayRange: 'Days 8-14',
    estimatedTime: '30-35 minutes',
    requiredFields: ['core_features', 'excluded_features'],
  },
  {
    key: 'channels',
    title: 'Launch Strategy (Days 15-21)',
    question: '🎯 Launch Goal: Where will you launch to get your first 10 users? Be specific about channels and tactics.',
    placeholder: 'Example: Product Hunt launch, 5 parenting Facebook groups, Instagram influencer outreach, friend referrals...',
    transition: 'Smart launch strategy! Now let\'s plan how you\'ll get your first paying customer...',
    dayRange: 'Days 15-21',
    estimatedTime: '25-30 minutes',
    requiredFields: ['channels', 'tactics'],
  },
  {
    key: 'pricing',
    title: 'Pricing Model (Days 22-28)',
    question: '💰 Revenue Goal: How will you make money? What pricing model fits your customers and what price point feels right?',
    placeholder: 'Example: Subscription model at $29/month, with a free trial for the first month. Target: 100 paying customers by month 3...',
    transition: 'Great pricing strategy! Finally, let\'s set your goals and timeline...',
    dayRange: 'Days 22-28',
    estimatedTime: '20-25 minutes',
    requiredFields: ['pricing_model', 'price_point', 'revenue_goal'],
  },
  {
    key: 'goals',
    title: 'Goals & Timeline (Days 29-30)',
    question: '🎯 Final Step: What does success look like 30 days from now? Set 3 specific, measurable goals for your launch.',
    placeholder: 'Example: 1) Launch MVP with 10 beta users, 2) Get 5 paying customers, 3) Validate core problem-solution fit...',
    transition: '🎉 Congratulations! You\'ve completed the Strategy Workshop. Let\'s generate your comprehensive launch report...',
    dayRange: 'Days 29-30',
    estimatedTime: '20-25 minutes',
    requiredFields: ['success_metrics', 'timeline'],
  },
];


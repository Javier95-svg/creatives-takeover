export type PublicTabVisibilityState = 'accessible' | 'preview' | 'locked' | 'hidden';

export interface PublicTabConfig {
  state: PublicTabVisibilityState;
  featureName: string;
  description?: string;
  previewItems?: string[];
  showPricingCta?: boolean;
}

export const PUBLIC_TAB_VISIBILITY: Record<string, PublicTabConfig> = {
  '/icp-builder': {
    state: 'accessible',
    featureName: 'ICP Builder',
  },
  '/demo-studio/classic': {
    state: 'accessible',
    featureName: 'Waitlist Builder',
  },
  '/pmf-lab': {
    state: 'locked',
    featureName: 'PMF Lab',
    description: 'Analyze your interview and demand signals before you commit to building the wrong thing.',
    previewItems: [
      'Preview the evidence intake flow founders use to pressure-test demand.',
      'See how PMF Lab scores real traction signals and flags missing proof.',
      'Unlock the full analysis workflow after sign-up.',
    ],
  },
  '/mvp-builder': {
    state: 'locked',
    featureName: 'MVP Builder',
    description: 'Generate a working MVP from a product brief and iterate visually inside the platform.',
    previewItems: [
      'Explore the builder shell, live preview workflow, and AI code generation path.',
      'Understand how prompts turn into a first working product draft.',
      'Sign up to start generating and refining your MVP.',
    ],
  },
  '/tech-stack': {
    state: 'preview',
    featureName: 'Tech Stack Builder',
    description: 'Compare the best-fit tools, frameworks, and platforms before you start building.',
    previewItems: [
      'Preview the recommendation flow for choosing your startup stack.',
      'See the kind of tooling guidance you unlock after sign-up.',
      'Use it to move from idea clarity into practical build decisions.',
    ],
  },
  '/go-to-market': {
    state: 'locked',
    featureName: 'GTM Strategist',
    description: 'Get a structured go-to-market brief with messaging, channels, and a concrete launch plan.',
    previewItems: [
      'See how the strategist turns your startup context into a launch brief.',
      'Preview channel recommendations, positioning prompts, and rollout structure.',
      'Sign up to generate your own GTM plan.',
    ],
  },
  '/directories': {
    state: 'locked',
    featureName: 'Directories',
    description: 'Shortlist the most relevant places to submit and distribute your startup launch.',
    previewItems: [
      'Preview the directory database founders use to plan distribution.',
      'See how launch channels are organized before you unlock the full list.',
      'Sign up to access the launch research workflow.',
    ],
  },
  '/mentorship': {
    state: 'accessible',
    featureName: 'Find a Mentor',
  },
  '/marketplace': {
    state: 'accessible',
    featureName: 'Marketplace',
  },
  '/co-founder': {
    state: 'locked',
    featureName: 'Find a Co-Founder',
    description: 'Browse real founder posts, see how projects are framed, and sign in to unlock outreach, posting, and matching.',
    previewItems: [
      'Preview founder cards, project stages, roles sought, and collaboration signals.',
      'See how startup teams present their opportunity before you join the network.',
      'Sign up to create posts, message founders, and unlock the full co-founder flow.',
    ],
  },
  '/investors': {
    state: 'locked',
    featureName: 'Find your Angel',
    description: 'Investor discovery stays visible as a premium aspiration surface, but full access is reserved for Pro members.',
    previewItems: [
      'Preview the investor discovery experience and profile layout.',
      'See what the Angels community unlocks once you have an account and the right plan.',
      'Use sign-up as the first step, then upgrade to Pro when you are ready to fundraise.',
    ],
    showPricingCta: true,
  },
  '/vc-search': {
    state: 'preview',
    featureName: 'VC Search',
    description: 'Search investor firms by stage, geography, and focus without burning time on low-fit outreach.',
    previewItems: [
      'Preview the filtering and profile discovery workflow.',
      'See how founders build their first target investor list inside the platform.',
      'Sign up to unlock the search experience and investor research flow.',
    ],
  },
  '/accelerator-hunt': {
    state: 'preview',
    featureName: 'Accelerator Hunt',
    description: 'Find accelerators that match your stage, geography, and startup focus before you apply.',
    previewItems: [
      'Preview the accelerator search workflow and fit signals.',
      'See how the platform helps founders shortlist relevant programs.',
      'Sign up to unlock the full research flow.',
    ],
  },
  '/email-templates': {
    state: 'preview',
    featureName: 'Email Templates',
    description: 'Copy-paste ready fundraising email templates for cold outreach, warm intros, and follow-ups.',
    previewItems: [
      'Preview the template library and how each email is structured.',
      'See the cold outreach, warm intro, and follow-up categories founders use.',
      'Sign up to copy templates and personalize the variables before sending.',
    ],
  },
  '/pitch-deck-analyzer': {
    state: 'preview',
    featureName: 'Pitch Deck Analyzer',
    description: 'Upload your deck and get fast feedback on clarity, structure, traction story, and investor readiness.',
    previewItems: [
      'Preview the assessment flow and scoring dimensions.',
      'See the kind of actionable deck feedback you unlock after sign-up.',
      'Use it when you are ready to tighten your fundraising narrative.',
    ],
  },
  '/traction-engine': {
    state: 'locked',
    featureName: 'Traction Engine',
    description: 'Log weekly distribution experiments, score retention, and track Phase 7 fundraising readiness.',
    previewItems: [
      'Preview the weekly traction sprint and retention scorecard founders run before fundraising.',
      'See how channel efficiency, experiment quality, and retention combine into a single Traction Score.',
      'Sign up to save weekly logs and unlock the Phase 7 readiness streak.',
    ],
  },
  '/insighta-test': {
    state: 'preview',
    featureName: 'Insighta Test',
    description: 'Measure your fundraising readiness before you start investor outreach.',
    previewItems: [
      'Preview the assessment experience and the themes it evaluates.',
      'See how the platform surfaces readiness gaps before a raise.',
      'Sign up to unlock the full test flow.',
    ],
  },
  '/newspaper': {
    state: 'accessible',
    featureName: 'Newspaper',
  },
  '/prompt-library': {
    state: 'locked',
    featureName: 'Prompt Library',
    description: 'Curated business idea prompts with complete 7-step launch journeys for BizMap AI.',
    previewItems: [
      'Preview the prompt catalogue across SaaS, e-commerce, consulting, and more.',
      'See how each concept maps to a 7-step, 30-day launch journey.',
      'Sign up to open the full prompt chains and launch them in BizMap AI.',
    ],
  },
  '/dashboard': {
    state: 'hidden',
    featureName: 'Home dashboard',
  },
  '/focus-funnel': {
    state: 'hidden',
    featureName: 'Focus Funnel',
  },
  '/decision-sprint': {
    state: 'hidden',
    featureName: 'Decision Sprint',
  },
  '/core-metrics': {
    state: 'hidden',
    featureName: 'Core Metrics',
  },
  '/routine': {
    state: 'hidden',
    featureName: 'Your Routine',
  },
  '/dashboard/routine': {
    state: 'hidden',
    featureName: 'Your Routine',
  },
  '/weekly-mission': {
    state: 'hidden',
    featureName: 'Your Routine',
  },
  '/tasks': {
    state: 'hidden',
    featureName: 'Your Tasks',
  },
};

export const getPublicTabConfig = (path: string): PublicTabConfig | undefined => PUBLIC_TAB_VISIBILITY[path];

export const getPublicTabState = (path: string): PublicTabVisibilityState =>
  PUBLIC_TAB_VISIBILITY[path]?.state ?? 'accessible';

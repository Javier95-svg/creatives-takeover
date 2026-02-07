import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useCredits } from './useCredits';
import { CREDIT_COSTS } from '@/config/constants';

export interface FeatureAccess {
  hasAccess: boolean;
  message?: string;
  requiredTier?: string;
  isLoading?: boolean;
}

export function useFeatureGating() {
  const { user } = useAuth();
  const { subscriptionData, loading: subscriptionLoading } = useSubscription();
  const { balance, hasCredits, loading: creditsLoading } = useCredits();

  const checkFeatureAccess = (feature: string): FeatureAccess => {
    if (!user) {
      return { hasAccess: false, message: 'Please sign in to access this feature' };
    }

    // Grant all features to admin account
    if (user.email?.toLowerCase() === 'admin@creatives-takeover.com') {
      return { hasAccess: true };
    }

    if (subscriptionLoading || creditsLoading) {
      return { hasAccess: true, isLoading: true };
    }

    const tier = subscriptionData.subscription_tier || 'free';

    switch (feature) {
      // BizMap AI conversation limits
      case 'bizmap_conversation':
        const conversationLimits = {
          free: 10,
          creator: 50,
          professional: 150
        };
        
        if (!hasCredits(CREDIT_COSTS.AI_CHAT_MESSAGE)) {
          return { 
            hasAccess: false, 
            message: `Insufficient credits. You need ${CREDIT_COSTS.AI_CHAT_MESSAGE} credit for BizMap AI conversations.`,
            requiredTier: tier === 'free' ? 'creator' : undefined
          };
        }
        return { hasAccess: true };

      // Community features
      case 'community_posting':
        // Allow specific email addresses to post regardless of tier
        const allowedCommunityPosters = [
          'tyler.jacob.tennant517@gmail.com',
          'aamirkgigyani@gmail.com'
        ];
        if (user.email && allowedCommunityPosters.includes(user.email.toLowerCase())) {
          return { hasAccess: true };
        }
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to create posts in the community',
          requiredTier: 'creator'
        };

      case 'community_commenting':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to comment on community posts',
          requiredTier: 'creator'
        };

      case 'community_voting':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to vote on community posts',
          requiredTier: 'creator'
        };

      case 'community_ai_insights':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier for AI-enhanced community features',
          requiredTier: 'professional'
        };

      // Prompt library features
      case 'prompt_library_export':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to export prompts',
          requiredTier: 'creator'
        };

      // Sprint planning
      case 'unlimited_sprints':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Free tier limited to 1 active sprint. Upgrade for unlimited sprints.',
          requiredTier: 'creator'
        };

      // Market intelligence
      case 'market_intelligence':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher for market intelligence',
          requiredTier: 'creator'
        };

      case 'market_intelligence_unlimited':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier for unlimited market intelligence queries',
          requiredTier: 'professional'
        };

      // Collaboration features
      case 'basic_collaboration':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher for collaboration tools',
          requiredTier: 'creator'
        };

      case 'advanced_collaboration':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier or higher for advanced collaboration',
          requiredTier: 'professional'
        };

      case 'collaboration_unlimited':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier for unlimited collaborators',
          requiredTier: 'professional'
        };

      // Business reports
      case 'report_generation':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to generate business reports',
          requiredTier: 'creator'
        };

      case 'custom_reports':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier or higher for custom business reports',
          requiredTier: 'professional'
        };

      case 'export_reports':
      case 'report_export_pdf':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier or higher to export reports as PDF',
          requiredTier: 'professional'
        };

      // Success analytics
      case 'success_analytics':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier or higher for success analytics',
          requiredTier: 'professional'
        };

      // API access
      case 'api_access':
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier for API access',
          requiredTier: 'professional'
        };

      // Tech Stack Generator
      case 'tech_stack_generation':
        if (tier === 'free') {
          // Free tier: 1 generation/month (3 credits)
          // Check will be done at component level for usage limits
          if (!hasCredits(CREDIT_COSTS.TECH_STACK_GENERATION)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. You need ${CREDIT_COSTS.TECH_STACK_GENERATION} credits for Tech Stack generation. Upgrade to Creator for unlimited generations.`,
              requiredTier: 'creator'
            };
          }
          return { hasAccess: true };
        }
        // Creator+ has unlimited (credit-gated)
        if (!hasCredits(CREDIT_COSTS.TECH_STACK_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.TECH_STACK_GENERATION} credits for Tech Stack generation.`,
          };
        }
        return { hasAccess: true };

      // Product-Market Fit Lab
      case 'pmf_analysis':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier to run full Product-Market Fit analysis. Free tier includes preview only.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (8 credits)
        if (!hasCredits(CREDIT_COSTS.PMF_ANALYSIS)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.PMF_ANALYSIS} credits for PMF analysis.`,
          };
        }
        return { hasAccess: true };

      case 'pmf_preview':
        // Preview mode available to all tiers
        return { hasAccess: true };

      // ICP Builder (Creator+ only)
      case 'icp_analysis':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier to run full ICP analysis. Free tier includes preview only.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (8 credits)
        if (!hasCredits(CREDIT_COSTS.ICP_ANALYSIS)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.ICP_ANALYSIS} credits for ICP analysis.`,
          };
        }
        return { hasAccess: true };

      // Insighta Test (Fundraising Readiness Assessment)
      case 'insighta_test':
        if (tier === 'free') {
          // Free tier: 1 assessment/month (8 credits)
          // Check will be done at component level for usage limits
          if (!hasCredits(CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. You need ${CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS} credits for Insighta Test. Upgrade to Creator for unlimited assessments.`,
              requiredTier: 'creator'
            };
          }
          return { hasAccess: true };
        }
        // Creator+ has unlimited (credit-gated)
        if (!hasCredits(CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS} credits for Insighta Test.`,
          };
        }
        return { hasAccess: true };

      // Investor Matchmaker
      case 'investor_matching':
        if (tier === 'free' || tier === 'creator') {
          return {
            hasAccess: false,
            message: 'Upgrade to Professional tier to access Investor Matchmaker.',
            requiredTier: 'professional'
          };
        }
        // Professional tier has full matching (5 credits)
        if (!hasCredits(CREDIT_COSTS.INVESTOR_MATCHING)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.INVESTOR_MATCHING} credits for investor matching.`,
          };
        }
        return { hasAccess: true };

      case 'investor_browse':
        // Browse/view-only available to all tiers
        return { hasAccess: true };

      // Pitch Deck Analyzer (Creator+ only)
      case 'pitch_deck_analyzer':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Pitch Deck Analyzer is available on Creator and Professional plans. Upgrade to analyze your pitch deck and get actionable feedback.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (8 credits)
        if (!hasCredits(CREDIT_COSTS.PITCH_DECK_ANALYZER)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. Pitch Deck Analyzer costs ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits. Your balance: ${balance}`,
          };
        }
        return { hasAccess: true };

      // Email Template Generation (Creator+ only)
      case 'email_template_generation':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'AI Email Template Generation is available on Creator and Professional plans. Upgrade to generate personalized investor emails.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (3 credits)
        if (!hasCredits(CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. Email generation costs ${CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION} credits. Your balance: ${balance}`,
          };
        }
        return { hasAccess: true };

      // VC Search View (handled by useVCViewTracking hook, but included for consistency)
      case 'vc_search_view':
        // This will be handled by useVCViewTracking hook
        return { hasAccess: true };

      // Dashboard Access
      case 'dashboard_access':
        // Free tier gets read-only access, Creator+ gets full access
        return { hasAccess: true };

      // Dashboard Features
      case 'focus_funnel':
        // Free tier: read-only, Creator+: full access
        return { hasAccess: true };

      case 'decision_sprint':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier or higher to use Decision Sprint.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (2 credits per generation)
        if (!hasCredits(CREDIT_COSTS.SPRINT_TASK_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. Decision Sprint costs ${CREDIT_COSTS.SPRINT_TASK_GENERATION} credits per generation.`,
          };
        }
        return { hasAccess: true };

      case 'core_metrics':
        // Free tier: read-only, Creator+: full access
        return { hasAccess: true };

      case 'weekly_mission':
        // Free tier: read-only, Creator+: full access
        return { hasAccess: true };

      case 'your_tasks':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier or higher to manage tasks.',
            requiredTier: 'creator'
          };
        }
        return { hasAccess: true };

      case 'roadmap_generation':
        if (['creator', 'professional'].includes(tier)) {
          if (!hasCredits(CREDIT_COSTS.ROADMAP_GENERATION)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. Roadmap Generation costs ${CREDIT_COSTS.ROADMAP_GENERATION} credits.`,
            };
          }
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher to generate roadmaps.',
          requiredTier: 'creator'
        };

      case 'market_research':
        if (['creator', 'professional'].includes(tier)) {
          if (!hasCredits(CREDIT_COSTS.MARKET_RESEARCH)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. Market Research costs ${CREDIT_COSTS.MARKET_RESEARCH} credits.`,
            };
          }
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher for market research.',
          requiredTier: 'creator'
        };

      case 'financial_analysis':
        if (['creator', 'professional'].includes(tier)) {
          if (!hasCredits(CREDIT_COSTS.FINANCIAL_ANALYSIS)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. Financial Analysis costs ${CREDIT_COSTS.FINANCIAL_ANALYSIS} credits.`,
            };
          }
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher for financial analysis.',
          requiredTier: 'creator'
        };

      case 'business_insights':
        if (['creator', 'professional'].includes(tier)) {
          if (!hasCredits(CREDIT_COSTS.BUSINESS_INSIGHTS)) {
            return {
              hasAccess: false,
              message: `Insufficient credits. Business Insights costs ${CREDIT_COSTS.BUSINESS_INSIGHTS} credits.`,
            };
          }
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher for business insights.',
          requiredTier: 'creator'
        };

      // MVP Builder (Creator+ only)
      case 'mvp_builder':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier or higher to access MVP Builder.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full access (5 credits)
        if (!hasCredits(CREDIT_COSTS.LAUNCH_REPORT)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. MVP Builder costs ${CREDIT_COSTS.LAUNCH_REPORT} credits.`,
          };
        }
        return { hasAccess: true };

      // GTM Strategist (Pro only)
      case 'gtm_strategist':
        if (tier !== 'professional') {
          return {
            hasAccess: false,
            message: 'Upgrade to Professional tier to access GTM Strategist.',
            requiredTier: 'professional'
          };
        }
        // Professional tier has full access (5 credits)
        if (!hasCredits(CREDIT_COSTS.ROADMAP_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. GTM Strategist costs ${CREDIT_COSTS.ROADMAP_GENERATION} credits.`,
          };
        }
        return { hasAccess: true };

      // Accelerator Hunt (Pro only)
      case 'accelerator_hunt':
        if (tier !== 'professional') {
          return {
            hasAccess: false,
            message: 'Upgrade to Professional tier to access Accelerator Hunt.',
            requiredTier: 'professional'
          };
        }
        // Professional tier has full access (free, no credits)
        return { hasAccess: true };

      // Find your Angel (Pro only)
      case 'find_your_angel':
        if (tier !== 'professional') {
          return {
            hasAccess: false,
            message: 'Upgrade to Professional tier to access Find your Angel.',
            requiredTier: 'professional'
          };
        }
        // Professional tier has full access (free, no credits)
        return { hasAccess: true };

      // Discovery Calls with Mentors
      case 'discovery_calls_mentors':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher to book discovery calls with mentors.',
          requiredTier: 'creator'
        };

      default:
        return { hasAccess: true };
    }
  };

  const getConversationLimit = (): number => {
    const tier = subscriptionData?.subscription_tier || 'free';
    const limits = {
      free: 10,
      creator: 50,
      professional: 150
    };
    return limits[tier as keyof typeof limits] || 10;
  };

  const getTierFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      free: [
        '25 credits per month',
        'Dashboard (Basic: Focus Funnel, Core Metrics, Weekly Mission - read-only)',
        'BizMap AI (25 messages/month)',
        'PMF Lab (read-only)',
        'Prompt Library (view only)',
        'VC Search (5 views/month)',
        'Stories (read-only)',
        'Community access (limited)'
      ],
      creator: [
        '50 credits per month',
        'Dashboard (Full access: Focus Funnel, Decision Sprint, Core Metrics, Weekly Mission, Your Tasks)',
        'BizMap AI Learn: ICP Builder & PMF Lab (full access)',
        'BizMap AI Build: MVP Builder, Business Planner, Tech Stack Builder',
        'Insighta: VC Search (25 views/month), Email Templates, Pitch Deck Analyzer, Insights Test',
        'Community: Find a Mentor, Find a Co-Founder',
        'Resources: Stories & Prompt Library (full access)',
        'Priority support'
      ],
      professional: [
        '150 credits per month',
        'Dashboard (Full access: All features)',
        'BizMap AI Learn: ICP Builder & PMF Lab',
        'BizMap AI Build: MVP Builder, Business Planner, Tech Stack Builder',
        'BizMap AI Measure: GTM Strategist',
        'Insighta: Unlimited VC Search, Accelerator Hunt, Email Templates, Advanced Pitch Deck Analyzer, Insights Test',
        'Community: Find a Mentor, Find a Co-Founder, Find your Angel',
        'Resources: Stories & Prompt Library (full + custom templates)',
        'Featured in Community',
        'Priority support (24h response)',
        'Early access to new features'
      ]
    };
    return featureMap[tierName] || [];
  };

  const currentTierValue = subscriptionData?.subscription_tier || 'free';

  return {
    checkFeatureAccess,
    getConversationLimit,
    getTierFeatures,
    currentTier: currentTierValue,
    isSubscribed: subscriptionData?.subscribed || false,
    hasCredits: (amount: number) => hasCredits(amount)
  };
}

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
  const { hasCredits, loading: creditsLoading } = useCredits();

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

    const tier = subscriptionData.subscription_tier || 'rookie';

    switch (feature) {
      // BizMap AI conversation limits
      case 'bizmap_conversation':
        if (!hasCredits(CREDIT_COSTS.AI_CHAT_MESSAGE)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.AI_CHAT_MESSAGE} credit for BizMap AI conversations.`,
            requiredTier: tier === 'rookie' ? 'rising' : undefined
          };
        }
        return { hasAccess: true };

      // Community features
      case 'community_posting': {
        // Allow specific email addresses to post regardless of tier
        const allowedCommunityPosters = [
          'tyler.jacob.tennant517@gmail.com',
          'aamirkgigyani@gmail.com'
        ];
        if (user.email && allowedCommunityPosters.includes(user.email.toLowerCase())) {
          return { hasAccess: true };
        }
        if (['starter', 'rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Starter plan or higher to create posts in the community',
          requiredTier: 'starter'
        };
      }

      case 'community_commenting':
        if (['starter', 'rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Starter plan or higher to comment on community posts',
          requiredTier: 'starter'
        };

      case 'community_voting':
        if (['starter', 'rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Starter plan or higher to vote on community posts',
          requiredTier: 'starter'
        };

      case 'community_ai_insights':
        if (tier === 'pro') {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Pro plan for AI-enhanced community features',
          requiredTier: 'pro'
        };

      // Prompt library features
      case 'prompt_library_export':
        if (['rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Rising plan or higher to export prompts',
          requiredTier: 'rising'
        };

      // Sprint planning
      case 'unlimited_sprints':
        if (['rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Rookie plan limited to 1 active sprint. Upgrade for unlimited sprints.',
          requiredTier: 'rising'
        };

      // Market intelligence
      case 'market_intelligence':
        if (['rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Rising plan or higher for market intelligence',
          requiredTier: 'rising'
        };

      case 'market_intelligence_unlimited':
        if (tier === 'pro') {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Pro plan for unlimited market intelligence queries',
          requiredTier: 'pro'
        };

      // Collaboration features
      case 'basic_collaboration':
        if (['starter', 'rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Starter plan or higher for collaboration tools',
          requiredTier: 'starter'
        };

      case 'advanced_collaboration':
      case 'collaboration_unlimited':
        if (tier === 'pro') {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Pro plan for advanced collaboration',
          requiredTier: 'pro'
        };

      // Business reports
      case 'report_generation':
        if (['rising', 'pro'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Rising plan or higher to generate business reports',
          requiredTier: 'rising'
        };

      case 'custom_reports':
      case 'export_reports':
      case 'report_export_pdf':
      case 'success_analytics':
      case 'api_access':
        if (tier === 'pro') {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Pro plan to access this feature',
          requiredTier: 'pro'
        };

      // Tech Stack Generator
      case 'tech_stack_generation':
        if (tier === 'rookie' || tier === 'starter') {
          return {
            hasAccess: false,
            message: 'Tech Stack is available in preview on Rookie and Starter. Upgrade to Rising for full access.',
            requiredTier: 'rising'
          };
        }
        return { hasAccess: true };

      // Product-Market Fit Lab — Rookie gets preview, Starter uses credits, Rising/Pro included
      case 'pmf_analysis':
        if (tier === 'rookie') {
          return {
            hasAccess: false,
            message: 'PMF Lab is available in preview on Rookie. Upgrade to Starter to run full analyses.',
            requiredTier: 'starter'
          };
        }
        if (tier === 'starter' && !hasCredits(CREDIT_COSTS.PMF_ANALYSIS)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.PMF_ANALYSIS} credits for PMF analysis.`,
          };
        }
        return { hasAccess: true };

      case 'pmf_preview':
        return { hasAccess: true };

      // ICP Builder (free for all tiers)
      case 'icp_analysis':
        return { hasAccess: true };

      // Insighta Test (included for all tiers)
      case 'insighta_test':
        return { hasAccess: true };

      // Investor Matchmaker
      case 'investor_matching':
        if (tier === 'rookie' || tier === 'rising') {
          return {
            hasAccess: false,
            message: 'Upgrade to Pro plan to access Investor Matchmaker.',
            requiredTier: 'pro'
          };
        }
        if (!hasCredits(CREDIT_COSTS.INVESTOR_MATCHING)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. You need ${CREDIT_COSTS.INVESTOR_MATCHING} credits for investor matching.`,
          };
        }
        return { hasAccess: true };

      case 'investor_browse':
        return { hasAccess: true };

      // Pitch Deck Analyzer (Rising+ only)
      case 'pitch_deck_analyzer':
        if (tier === 'rookie' || tier === 'starter') {
          return {
            hasAccess: false,
            message: 'Pitch Deck Analyzer is available on Rising and Pro plans.',
            requiredTier: 'rising'
          };
        }
        return { hasAccess: true };

      // Email Template Generation (Starter+ included)
      case 'email_template_generation':
        if (tier === 'rookie') {
          return {
            hasAccess: false,
            message: 'Email Templates are available from the Starter plan.',
            requiredTier: 'starter'
          };
        }
        return { hasAccess: true };

      // VC Search View (handled by usePlanAccess + useVCViewTracking)
      case 'vc_search_view':
        return { hasAccess: true };

      // Dashboard Access
      case 'dashboard_access':
      case 'focus_funnel':
      case 'core_metrics':
      case 'weekly_mission':
        return { hasAccess: true };

      case 'decision_sprint':
        if (tier === 'rookie' || tier === 'starter') {
          return {
            hasAccess: tier === 'starter',
            message: tier === 'starter'
              ? undefined
              : 'Upgrade to Starter plan or higher to use Decision Sprint.',
            requiredTier: tier === 'starter' ? undefined : 'starter'
          };
        }
        if (!hasCredits(CREDIT_COSTS.SPRINT_TASK_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. Decision Sprint costs ${CREDIT_COSTS.SPRINT_TASK_GENERATION} credits per generation.`,
          };
        }
        return { hasAccess: true };

      case 'your_tasks':
        if (tier === 'rookie') {
          return {
            hasAccess: false,
            message: 'Upgrade to Starter plan or higher to manage tasks.',
            requiredTier: 'starter'
          };
        }
        return { hasAccess: true };

      case 'roadmap_generation':
        if (['rising', 'pro'].includes(tier)) {
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
          message: 'Upgrade to Rising plan or higher to generate roadmaps.',
          requiredTier: 'rising'
        };

      case 'market_research':
        if (['rising', 'pro'].includes(tier)) {
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
          message: 'Upgrade to Rising plan or higher for market research.',
          requiredTier: 'rising'
        };

      case 'financial_analysis':
        if (['rising', 'pro'].includes(tier)) {
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
          message: 'Upgrade to Rising plan or higher for financial analysis.',
          requiredTier: 'rising'
        };

      case 'business_insights':
        if (['rising', 'pro'].includes(tier)) {
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
          message: 'Upgrade to Rising plan or higher for business insights.',
          requiredTier: 'rising'
        };

      // MVP Builder (Rising+ only, or progressive unlock for Rookie)
      case 'mvp_builder':
        if (tier === 'rookie' || tier === 'starter') {
          return {
            hasAccess: false,
            message: 'MVP Builder is available in preview on Rookie and Starter. Upgrade to Rising for full access.',
            requiredTier: 'rising'
          };
        }
        if (!hasCredits(CREDIT_COSTS.LAUNCH_REPORT)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. MVP Builder costs ${CREDIT_COSTS.LAUNCH_REPORT} credits.`,
          };
        }
        return { hasAccess: true };

      // GTM Strategist (Rising+ — progressive for Rookie)
      case 'gtm_strategist':
        if (tier === 'rookie' || tier === 'starter') {
          return {
            hasAccess: false,
            message: 'GTM Strategist is available in preview on Rookie and Starter. Upgrade to Rising for full access.',
            requiredTier: 'rising'
          };
        }
        if (!hasCredits(CREDIT_COSTS.ROADMAP_GENERATION)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. GTM Strategist costs ${CREDIT_COSTS.ROADMAP_GENERATION} credits.`,
          };
        }
        return { hasAccess: true };

      // Accelerator Hunt — all plans can browse; profile views gated by usePlanAccess
      case 'accelerator_hunt':
        return { hasAccess: true };

      // Find your Angel (Pro only)
      case 'find_your_angel':
        if (tier !== 'pro') {
          return {
            hasAccess: false,
            message: 'Upgrade to Pro plan to access the Angels community.',
            requiredTier: 'pro'
          };
        }
        return { hasAccess: true };

      // Discovery Calls — credit cost now 10; quota logic handled by usePlanAccess
      case 'discovery_calls_mentors':
        if (!hasCredits(CREDIT_COSTS.DISCOVERY_CALL)) {
          return {
            hasAccess: false,
            message: `Insufficient credits. Discovery calls cost ${CREDIT_COSTS.DISCOVERY_CALL} credits.`,
          };
        }
        return { hasAccess: true };

      default:
        return { hasAccess: true };
    }
  };

  const getConversationLimit = (): number => {
    const tier = subscriptionData?.subscription_tier || 'rookie';
    const limits: Record<string, number> = {
      rookie: 25,
      starter: 50,
      rising: 100,
      pro: 300,
    };
    return limits[tier] ?? 25;
  };

  const getTierFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      rookie: [
        '25 credits per month',
        'ICP Builder included',
        'Waitlist Maker and PMF Lab not included',
        '1 free discovery call per billing cycle',
        '1 co-founder post per billing cycle',
        'VC Search and Accelerator Hunt list-only',
        'Prompt Library: Business Case only',
        'Insighta Test and Newspaper included',
      ],
      starter: [
        '50 credits per month',
        'ICP Builder included',
        'Waitlist Maker and PMF Lab use credits',
        'MVP Builder, Tech Stack, GTM Strategist, and Directories in preview mode',
        '2 free discovery calls per billing cycle',
        '2 co-founder posts per billing cycle',
        '2 VC and 2 accelerator profiles per billing cycle',
        'Basic email templates and 5 prompt templates',
      ],
      rising: [
        '100 credits per month',
        'All 7 tools accessible in any order',
        'Most BizMap tools included without per-use credits',
        'MVP Builder and GTM Strategist still use credits',
        '3 free discovery calls per billing cycle, then 10 credits each',
        'Unlimited free co-founder posts',
        '10 VC and 10 accelerator profiles per billing cycle',
        'Full email templates, pitch deck analyzer, and prompt library',
      ],
      pro: [
        '300 credits per month',
        'Everything in Rising',
        'MVP Builder and GTM Strategist still use credits',
        'Unlimited discovery calls',
        'Unlimited VC and Accelerator profile views',
        'Angels community access',
        'Group office hours and priority support',
      ],
    };
    return featureMap[tierName] || [];
  };

  const currentTierValue = subscriptionData?.subscription_tier || 'rookie';

  return {
    checkFeatureAccess,
    getConversationLimit,
    getTierFeatures,
    currentTier: currentTierValue,
    isSubscribed: subscriptionData?.subscribed || false,
    hasCredits: (amount: number) => hasCredits(amount)
  };
}

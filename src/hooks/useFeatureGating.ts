import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useCredits } from './useCredits';
import { CREDIT_COSTS } from '@/config/constants';

export interface FeatureAccess {
  hasAccess: boolean;
  message?: string;
  requiredTier?: string;
}

export function useFeatureGating() {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const { balance, hasCredits } = useCredits();

  const checkFeatureAccess = (feature: string): FeatureAccess => {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFeatureGating.ts:16',message:'checkFeatureAccess entry',data:{feature,hasUser:!!user,hasSubscriptionData:!!subscriptionData,subscriptionTier:subscriptionData?.subscription_tier},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!user) {
      return { hasAccess: false, message: 'Please sign in to access this feature' };
    }

    // Grant all features to admin account
    if (user.email?.toLowerCase() === 'admin@creatives-takeover.com') {
      return { hasAccess: true };
    }

    // Safety check for subscriptionData
    if (!subscriptionData) {
      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFeatureGating.ts:28',message:'subscriptionData is null/undefined',data:{feature},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return { hasAccess: false, message: 'Loading subscription data...' };
    }

    const tier = subscriptionData.subscription_tier || 'free';
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFeatureGating.ts:32',message:'checkFeatureAccess tier determined',data:{feature,tier,subscriptionTier:subscriptionData.subscription_tier},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return {
          hasAccess: false,
          message: 'Upgrade to Creator tier or higher to access the Dashboard.',
          requiredTier: 'creator'
        };

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
        '10 credits per month',
        'BizMap - Business Planning Mode',
        'Prompt Library (Free Models Only)',
        'Insighta Test Assessment',
        'Funding Opportunities',
        'Full access to Stories (Content)'
      ],
      creator: [
        '50 credits per month',
        'Dashboard Access',
        'BizMap AI Upgrade: Business Planning & PMF Lab modes.',
        'Full Access to Prompt Library',
        'Insighta Test Assessment',
        'Funding Opportunities',
        'Discovery Calls with Mentors (Community)',
        'Full access to Stories (Content)'
      ],
      professional: [
        '150 credits per month',
        'Dashboard Access',
        'Full Access to BizMap AI (Business Planning, PMF Lab & Tech Stack)',
        'Full Access to Prompt Library',
        'Insighta Test Assessment',
        'Investor Matchmaker (Insighta)',
        'Funding Opportunities',
        'Discovery Calls with Mentors (Community)',
        'Full access to Stories (Content)'
      ]
    };
    return featureMap[tierName] || [];
  };

  // #region agent log
  const currentTierValue = subscriptionData?.subscription_tier || 'free';
  fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFeatureGating.ts:383',message:'useFeatureGating return',data:{hasSubscriptionData:!!subscriptionData,currentTier:currentTierValue,isSubscribed:subscriptionData?.subscribed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return {
    checkFeatureAccess,
    getConversationLimit,
    getTierFeatures,
    currentTier: currentTierValue,
    isSubscribed: subscriptionData?.subscribed || false,
    hasCredits: (amount: number) => hasCredits(amount)
  };
}

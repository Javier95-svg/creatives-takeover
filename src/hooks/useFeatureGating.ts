import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useCredits } from './useCredits';

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
    if (!user) {
      return { hasAccess: false, message: 'Please sign in to access this feature' };
    }

    // Grant all features to admin account
    if (user.email?.toLowerCase() === 'admin@creatives-takeover.com') {
      return { hasAccess: true };
    }

    // Safety check for subscriptionData
    if (!subscriptionData) {
      return { hasAccess: false, message: 'Loading subscription data...' };
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
        
        if (!hasCredits(1)) {
          return { 
            hasAccess: false, 
            message: `Insufficient credits. You need 1 credit for BizMap AI conversations.`,
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
          if (!hasCredits(3)) {
            return {
              hasAccess: false,
              message: 'Insufficient credits. You need 3 credits for Tech Stack generation. Upgrade to Creator for unlimited generations.',
              requiredTier: 'creator'
            };
          }
          return { hasAccess: true };
        }
        // Creator+ has unlimited (credit-gated)
        if (!hasCredits(3)) {
          return {
            hasAccess: false,
            message: 'Insufficient credits. You need 3 credits for Tech Stack generation.',
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
        if (!hasCredits(8)) {
          return {
            hasAccess: false,
            message: 'Insufficient credits. You need 8 credits for PMF analysis.',
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
          if (!hasCredits(8)) {
            return {
              hasAccess: false,
              message: 'Insufficient credits. You need 8 credits for Insighta Test. Upgrade to Creator for unlimited assessments.',
              requiredTier: 'creator'
            };
          }
          return { hasAccess: true };
        }
        // Creator+ has unlimited (credit-gated)
        if (!hasCredits(8)) {
          return {
            hasAccess: false,
            message: 'Insufficient credits. You need 8 credits for Insighta Test.',
          };
        }
        return { hasAccess: true };

      // Investor Matchmaker
      case 'investor_matching':
        if (tier === 'free') {
          return {
            hasAccess: false,
            message: 'Upgrade to Creator tier to get investor matches. Free tier allows browsing only.',
            requiredTier: 'creator'
          };
        }
        // Creator+ has full matching (5 credits)
        if (!hasCredits(5)) {
          return {
            hasAccess: false,
            message: 'Insufficient credits. You need 5 credits for investor matching.',
          };
        }
        return { hasAccess: true };

      case 'investor_browse':
        // Browse/view-only available to all tiers
        return { hasAccess: true };

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
        '10 BizMap AI conversations (1 credit each)',
        '1 Tech Stack generation (3 credits)',
        '1 Insighta Test assessment (8 credits)',
        'Product-Market Fit Lab preview',
        'Investor Matchmaker browse-only',
        'Community read-only access',
        'Prompt library (view free prompts only)',
        '1 active sprint',
        'Funding opportunities (view only)',
        'Job board (view only)',
        'Community forum support'
      ],
      creator: [
        '50 credits per month',
        'Unlimited BizMap AI conversations (1 credit each)',
        'Unlimited Tech Stack generations (3 credits each)',
        'Full Product-Market Fit Lab access (8 credits each)',
        'Unlimited Insighta Test assessments (8 credits each)',
        'Full Investor Matchmaker access (5 credits per match)',
        'Full community access (post, comment, vote)',
        'Prompt library with export (3 credits per export)',
        'Unlimited sprints',
        'Market intelligence (10 queries/month, 10 credits each)',
        'Basic collaboration (up to 3 team members)',
        'Basic reports (5/month, 5 credits each)',
        'Priority email support (48hr response)'
      ],
      professional: [
        '150 credits per month',
        'Unlimited BizMap AI conversations (1 credit each)',
        'Unlimited Tech Stack generations (3 credits each)',
        'Full Product-Market Fit Lab access (8 credits each)',
        'Unlimited Insighta Test assessments (8 credits each)',
        'Full Investor Matchmaker access (5 credits per match)',
        'AI-enhanced community features',
        'Unlimited market intelligence queries',
        'Unlimited custom reports + PDF export',
        'Advanced collaboration (unlimited team members)',
        'Success score analytics',
        'API access',
        '24hr priority support'
      ]
    };
    return featureMap[tierName] || [];
  };

  return {
    checkFeatureAccess,
    getConversationLimit,
    getTierFeatures,
    currentTier: subscriptionData?.subscription_tier || 'free',
    isSubscribed: subscriptionData?.subscribed || false,
    hasCredits: (amount: number) => hasCredits(amount)
  };
}
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

    const tier = subscriptionData.subscription_tier;

    switch (feature) {
      // BizMap AI conversation limits
      case 'bizmap_conversation':
        const conversationLimits = {
          free: 5,
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

      default:
        return { hasAccess: true };
    }
  };

  const getConversationLimit = (): number => {
    const tier = subscriptionData.subscription_tier;
    const limits = {
      free: 5,
      creator: 50,
      professional: 150
    };
    return limits[tier as keyof typeof limits] || 5;
  };

  const getTierFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      free: [
        '5 BizMap AI conversations per month',
        'Community read-only access',
        'Prompt library (view only)',
        '1 active sprint',
        'Community forum support'
      ],
      creator: [
        '50 BizMap AI conversations per month',
        'Full community access',
        'Prompt library with export',
        'Unlimited sprints',
        'Market intelligence (10 queries/month)',
        'Basic collaboration (3 max)',
        'Basic reports (5/month)',
        'Priority email support'
      ],
      professional: [
        '150 BizMap AI conversations per month',
        'AI-enhanced community',
        'Unlimited market intelligence',
        'Unlimited custom reports + PDF export',
        'Advanced collaboration (unlimited)',
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
    currentTier: subscriptionData.subscription_tier,
    isSubscribed: subscriptionData.subscribed,
    hasCredits: (amount: number) => hasCredits(amount)
  };
}
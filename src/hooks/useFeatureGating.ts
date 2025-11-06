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
      case 'community_commenting':
        if (tier === 'free') {
          return { hasAccess: true }; // Basic access for free tier
        }
        return { hasAccess: true };

      case 'community_voting':
        if (['creator', 'professional'].includes(tier)) {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Creator tier or higher to vote on community posts',
          requiredTier: 'creator'
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

      // Business reports
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
        if (tier === 'professional') {
          return { hasAccess: true };
        }
        return { 
          hasAccess: false, 
          message: 'Upgrade to Professional tier or higher to export reports',
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
        'Basic community access',
        'Prompt library (view only)',
        '1 active sprint',
        'Email support'
      ],
      creator: [
        '50 BizMap AI conversations per month',
        'Full community features',
        'Prompt library export',
        'Unlimited sprints',
        'Market intelligence',
        'Basic collaboration',
        'Priority support'
      ],
      professional: [
        '150 BizMap AI conversations per month',
        'AI-enhanced community features',
        'Custom business reports',
        'Advanced collaboration tools',
        'Success score analytics',
        'Export capabilities',
        'Priority support'
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
/**
 * Promotion Configuration System
 * Centralized configuration for all platform promotions
 */

export type PromotionType = 'bonus_credits' | 'discount' | 'free_trial_extension' | 'feature_unlock';

export interface Promotion {
  id: string;
  active: boolean;
  type: PromotionType;
  title: string;
  description: string;
  endDate: string; // ISO 8601 format
  value: number; // Credits, percentage, or days
  showCountdown: boolean;
  targetAudience?: 'new_users' | 'existing_users' | 'all';
  pages?: string[]; // Pages where promotion should appear
}

export const ACTIVE_PROMOTIONS: Promotion[] = [
  {
    id: 'signup-bonus-2024',
    active: true,
    type: 'bonus_credits',
    title: 'Limited Time: Get 5 Bonus Credits',
    description: 'Sign up in the next 24 hours and receive 5 bonus credits to explore premium features',
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    value: 5,
    showCountdown: true,
    targetAudience: 'new_users',
    pages: ['/', '/signup']
  },
  {
    id: 'early-access-2024',
    active: true,
    type: 'bonus_credits',
    title: 'Early Access Special',
    description: 'Join now and get 3 bonus credits + early access to new features',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    value: 3,
    showCountdown: true,
    targetAudience: 'all',
    pages: ['/']
  },
  {
    id: 'pricing-discount-2024',
    active: true,
    type: 'discount',
    title: 'Limited Time: 20% Off First Month',
    description: 'Upgrade to Creator or Professional plan and save 20% on your first month',
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    value: 20,
    showCountdown: true,
    targetAudience: 'existing_users',
    pages: ['/pricing']
  }
];

/**
 * Get active promotions for a specific page
 */
export const getPromotionsForPage = (pagePath: string, userType?: 'new' | 'existing'): Promotion[] => {
  return ACTIVE_PROMOTIONS.filter(promo => {
    if (!promo.active) return false;
    if (promo.pages && !promo.pages.includes(pagePath)) return false;
    
    if (promo.targetAudience === 'new_users' && userType !== 'new') return false;
    if (promo.targetAudience === 'existing_users' && userType !== 'existing') return false;
    
    // Check if promotion hasn't expired
    const endDate = new Date(promo.endDate);
    return endDate > new Date();
  });
};

/**
 * Get the primary promotion for a page (most urgent/valuable)
 */
export const getPrimaryPromotion = (pagePath: string, userType?: 'new' | 'existing'): Promotion | null => {
  const promotions = getPromotionsForPage(pagePath, userType);
  if (promotions.length === 0) return null;
  
  // Sort by urgency (time remaining) and value
  return promotions.sort((a, b) => {
    const timeA = new Date(a.endDate).getTime() - Date.now();
    const timeB = new Date(b.endDate).getTime() - Date.now();
    
    // Prioritize promotions ending sooner
    if (Math.abs(timeA - timeB) > 60 * 60 * 1000) {
      return timeA - timeB;
    }
    
    // Then by value
    return b.value - a.value;
  })[0];
};


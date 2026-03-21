export const ADMIN_EMAIL = 'admin@creatives-takeover.com';

export const ADMIN_SUBSCRIPTION = {
  subscribed: true,
  subscription_tier: 'professional',
  subscription_end: null,
} as const;

export const isAdminEmail = (email?: string | null): boolean =>
  typeof email === 'string' && email.trim().toLowerCase() === ADMIN_EMAIL;

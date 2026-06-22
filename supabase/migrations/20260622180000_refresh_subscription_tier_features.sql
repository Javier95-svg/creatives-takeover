-- Refresh subscription_tiers.features (shown in the account/subscription status
-- screen) so it matches the live /pricing page after recent upgrades:
--   * "Waitlist Maker" renamed to "Demo Studio".
--   * MVP Builder is unlocked on every plan (per-action credits), not Rising-only.
--   * Discovery Calls are unlimited / credit-metered on every plan (was capped
--     1/2/3 per cycle).
-- Wording mirrors PricingComparison.tsx / PLAN_HIGHLIGHTS.

UPDATE public.subscription_tiers
SET features = '[
  "50 credits per month",
  "ICP Builder free",
  "MVP Builder unlocked; per-action credits (5 per generation, 3 per refinement)",
  "Demo Studio unlocked; 3 credits per generation",
  "Insighta Test included",
  "Newspaper included",
  "Prompt Library free models only",
  "VC Search and Accelerator Hunt browse only",
  "Unlimited Discovery Calls; 10 credits per booking",
  "1 Find a Co-Founder post per billing cycle"
]'::jsonb
WHERE tier_name = 'rookie';

UPDATE public.subscription_tiers
SET features = '[
  "100 credits per month",
  "Everything in Rookie",
  "PMF Lab unlocked; 6 credits per full analysis, 4 per evidence score",
  "Email Templates full access",
  "2 VC and 2 Accelerator profile views per billing cycle",
  "2 Find a Co-Founder posts per billing cycle"
]'::jsonb
WHERE tier_name = 'starter';

UPDATE public.subscription_tiers
SET features = '[
  "250 credits per month",
  "Everything in Starter",
  "Tech Stack Builder unlocked; 3 credits per generation",
  "GTM Strategist unlocked; 5 credits per strategy",
  "Directories included",
  "Pitch Deck Analyzer unlocked; 6 credits per analysis",
  "Prompt Library full access; custom actions use credits",
  "10 VC and 10 Accelerator profile views per billing cycle",
  "Unlimited Find a Co-Founder posts"
]'::jsonb
WHERE tier_name = 'rising';

UPDATE public.subscription_tiers
SET features = '[
  "600 credits per month",
  "Everything in Rising",
  "Find Your Angel included",
  "Unlimited VC and Accelerator profile views",
  "Unlimited Find a Co-Founder posts",
  "Highest credit runway for generative tools"
]'::jsonb
WHERE tier_name = 'pro';

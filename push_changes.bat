@echo off
cd /d "%~dp0"
git add supabase/migrations/20250125000001_update_free_tier_to_10_credits.sql
git add supabase/migrations/20250125000002_update_new_user_initialization_to_10_credits.sql
git add supabase/migrations/20250125000003_update_grant_monthly_credits_default_to_10.sql
git add src/hooks/useFeatureGating.ts
git add src/components/Pricing.tsx
git add src/components/PricingComparison.tsx
git add src/components/CreditDisplay.tsx
git add src/components/CreditStatus.tsx
git add src/components/CreditGate.tsx
git add src/components/HomeFAQ.tsx
git commit -m "Update free tier to 10 credits per month - freemium monetization strategy

- Updated free tier from 5 to 10 credits per month
- Updated user initialization to grant 10 credits
- Updated grant_monthly_credits default fallback to 10
- Updated all UI components and feature gating
- Updated pricing displays and FAQs
- Improved upgrade messaging and low credit thresholds"
git push origin main


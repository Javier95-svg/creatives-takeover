-- Update subscription pricing to correct values
UPDATE subscription_tiers SET price_cents = 1999 WHERE tier_name = 'basic';
UPDATE subscription_tiers SET price_cents = 3999 WHERE tier_name = 'premium';
UPDATE subscription_tiers SET price_cents = 5999 WHERE tier_name = 'enterprise';
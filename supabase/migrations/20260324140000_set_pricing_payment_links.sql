ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_yearly TEXT;

ALTER TABLE public.credit_packs
ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT;

UPDATE public.subscription_tiers
SET
  stripe_payment_link_monthly = 'https://buy.stripe.com/aFacN67Sxg8T9b80bh0VO00',
  stripe_payment_link_yearly = 'https://buy.stripe.com/3cIdRa7SxcWH1IG6zF0VO01'
WHERE tier_name = 'creator';

UPDATE public.subscription_tiers
SET
  stripe_payment_link_monthly = 'https://buy.stripe.com/cNifZi0q5f4P7303nt0VO02',
  stripe_payment_link_yearly = 'https://buy.stripe.com/4gMbJ2dcR09V1IGf6b0VO03'
WHERE tier_name = 'professional';

UPDATE public.credit_packs
SET stripe_payment_link = 'https://buy.stripe.com/dRm5kE4Gl9Kv8746zF0VO0h'
WHERE id = 'pack_20';

UPDATE public.credit_packs
SET stripe_payment_link = 'https://buy.stripe.com/aFa4gAegV8Grafc3nt0VO0i'
WHERE id = 'pack_40';

UPDATE public.credit_packs
SET stripe_payment_link = 'https://buy.stripe.com/8x29AUc8N1dZevsgaf0VO0j'
WHERE id = 'pack_60';

-- Restore the platform top-up packs used by the MVP Builder exhaustion dialog.

UPDATE public.credit_packs
SET active = false
WHERE id IN ('pack_micro', 'pack_builder', 'pack_growth', 'pack_scale');

INSERT INTO public.credit_packs (
  id,
  credits,
  price_cents,
  stripe_payment_link,
  label,
  active
)
VALUES
  ('pack_20', 20, 800, 'https://buy.stripe.com/dRm5kE4Gl9Kv8746zF0VO0h', 'Starter Pack', true),
  ('pack_40', 40, 1600, 'https://buy.stripe.com/aFa4gAegV8Grafc3nt0VO0i', 'Boost Pack', true),
  ('pack_60', 60, 2400, 'https://buy.stripe.com/8x29AUc8N1dZevsgaf0VO0j', 'Power Pack', true)
ON CONFLICT (id) DO UPDATE SET
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  stripe_payment_link = EXCLUDED.stripe_payment_link,
  label = EXCLUDED.label,
  active = EXCLUDED.active;

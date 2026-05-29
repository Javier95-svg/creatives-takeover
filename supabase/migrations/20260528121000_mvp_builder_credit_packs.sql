-- Align top-up packs with MVP Builder Phase 1 pricing.

UPDATE public.credit_packs
SET active = false
WHERE id IN ('pack_20', 'pack_40', 'pack_60');

INSERT INTO public.credit_packs (id, credits, price_cents, label, active)
VALUES
  ('pack_micro', 30, 900, 'Micro Pack', true),
  ('pack_builder', 100, 2500, 'Builder Pack', true),
  ('pack_growth', 220, 4900, 'Growth Pack', true),
  ('pack_scale', 500, 9900, 'Scale Pack', true)
ON CONFLICT (id) DO UPDATE SET
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  label = EXCLUDED.label,
  active = EXCLUDED.active;

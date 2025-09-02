-- Widen score columns to prevent numeric overflow and allow 0-100 range with 2 decimals
BEGIN;

ALTER TABLE public.trends
  ALTER COLUMN trend_score TYPE numeric(5,2),
  ALTER COLUMN trend_score SET DEFAULT 0.00;

ALTER TABLE public.trends
  ALTER COLUMN opportunity_score TYPE numeric(5,2),
  ALTER COLUMN opportunity_score SET DEFAULT 0.00;

COMMIT;
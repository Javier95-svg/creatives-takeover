-- PMF Lab — Reddit-first customer discovery.
-- Extends the discovery deliverable with clustered pain points, a people-to-contact
-- outreach list, and source metadata (which data sources were available). Additive only;
-- communities/threads remain jsonb with a richer shape (no DDL needed). RLS unchanged.

ALTER TABLE public.pmf_customer_discovery
  ADD COLUMN IF NOT EXISTS pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS people JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

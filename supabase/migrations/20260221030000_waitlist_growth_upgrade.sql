-- Waitlist growth upgrade: stage completion hardening, conversion analytics, and integrations

ALTER TABLE public.waitlist_pages
  ADD COLUMN IF NOT EXISTS mark_ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'indigo',
  ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'centered',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS launch_date DATE,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS integration_provider TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS integration_list_id TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_email_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS headline_variant_b TEXT,
  ADD COLUMN IF NOT EXISTS referral_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waitlist_pages_theme_check'
  ) THEN
    ALTER TABLE public.waitlist_pages
      ADD CONSTRAINT waitlist_pages_theme_check
      CHECK (theme IN ('light', 'dark'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waitlist_pages_layout_check'
  ) THEN
    ALTER TABLE public.waitlist_pages
      ADD CONSTRAINT waitlist_pages_layout_check
      CHECK (layout IN ('centered', 'split'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waitlist_pages_integration_provider_check'
  ) THEN
    ALTER TABLE public.waitlist_pages
      ADD CONSTRAINT waitlist_pages_integration_provider_check
      CHECK (integration_provider IN ('none', 'mailchimp', 'convertkit'));
  END IF;
END $$;

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS email_normalized TEXT,
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_signups'
      AND policyname = 'Public insert waitlist signups'
  ) THEN
    DROP POLICY "Public insert waitlist signups" ON public.waitlist_signups;
  END IF;
END $$;

UPDATE public.waitlist_signups
SET email_normalized = lower(trim(email))
WHERE email_normalized IS NULL OR email_normalized = '';

-- Deduplicate historical rows before applying case-insensitive uniqueness
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY waitlist_page_id, lower(trim(email))
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM public.waitlist_signups
)
DELETE FROM public.waitlist_signups target
USING ranked
WHERE target.id = ranked.id
  AND ranked.row_num > 1;

ALTER TABLE public.waitlist_signups
  ALTER COLUMN email_normalized SET NOT NULL;

ALTER TABLE public.waitlist_signups
  DROP CONSTRAINT IF EXISTS waitlist_signups_waitlist_page_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_unique_page_email_normalized
  ON public.waitlist_signups(waitlist_page_id, email_normalized);

CREATE INDEX IF NOT EXISTS waitlist_signups_page_created_idx
  ON public.waitlist_signups(waitlist_page_id, created_at DESC);

CREATE INDEX IF NOT EXISTS waitlist_signups_utm_source_idx
  ON public.waitlist_signups(waitlist_page_id, utm_source);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'waitlist_signups_variant_check'
  ) THEN
    ALTER TABLE public.waitlist_signups
      ADD CONSTRAINT waitlist_signups_variant_check
      CHECK (variant IN ('A', 'B') OR variant IS NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.waitlist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_page_id UUID NOT NULL REFERENCES public.waitlist_pages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('VIEW', 'SIGNUP')),
  variant TEXT CHECK (variant IN ('A', 'B')),
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS waitlist_events_page_type_time_idx
  ON public.waitlist_events(waitlist_page_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS waitlist_events_page_session_idx
  ON public.waitlist_events(waitlist_page_id, session_id, event_type);

ALTER TABLE public.waitlist_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_events'
      AND policyname = 'Owners read waitlist events'
  ) THEN
    CREATE POLICY "Owners read waitlist events"
      ON public.waitlist_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.waitlist_pages
          WHERE waitlist_pages.id = waitlist_events.waitlist_page_id
            AND waitlist_pages.user_id = auth.uid()
        )
      );
  END IF;
END $$;

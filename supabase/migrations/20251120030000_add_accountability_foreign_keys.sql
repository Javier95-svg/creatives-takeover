-- Add foreign key constraints to accountability_partnerships table
-- These constraints ensure referential integrity and enable proper joins

-- Add foreign key constraint for requester_id -> profiles(id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accountability_partnerships_requester_id_fkey'
  ) THEN
    ALTER TABLE public.accountability_partnerships
    ADD CONSTRAINT accountability_partnerships_requester_id_fkey
    FOREIGN KEY (requester_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for partner_id -> profiles(id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accountability_partnerships_partner_id_fkey'
  ) THEN
    ALTER TABLE public.accountability_partnerships
    ADD CONSTRAINT accountability_partnerships_partner_id_fkey
    FOREIGN KEY (partner_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for sprint_id -> sprints(id) if sprints table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprints') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'accountability_partnerships_sprint_id_fkey'
    ) THEN
      ALTER TABLE public.accountability_partnerships
      ADD CONSTRAINT accountability_partnerships_sprint_id_fkey
      FOREIGN KEY (sprint_id) 
      REFERENCES public.sprints(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add foreign key constraint for partnership_id -> accountability_partnerships(id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accountability_nudges_partnership_id_fkey'
  ) THEN
    ALTER TABLE public.accountability_nudges
    ADD CONSTRAINT accountability_nudges_partnership_id_fkey
    FOREIGN KEY (partnership_id) 
    REFERENCES public.accountability_partnerships(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for nudger_id -> profiles(id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accountability_nudges_nudger_id_fkey'
  ) THEN
    ALTER TABLE public.accountability_nudges
    ADD CONSTRAINT accountability_nudges_nudger_id_fkey
    FOREIGN KEY (nudger_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for nudged_id -> profiles(id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accountability_nudges_nudged_id_fkey'
  ) THEN
    ALTER TABLE public.accountability_nudges
    ADD CONSTRAINT accountability_nudges_nudged_id_fkey
    FOREIGN KEY (nudged_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;


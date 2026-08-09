-- PostgreSQL requires enum additions to commit before following migrations use
-- the values in indexes, defaults, or function bodies.

ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'pending_mentor_response';
ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'pending_founder_response';
ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'awaiting_outcome';
ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'withdrawn';

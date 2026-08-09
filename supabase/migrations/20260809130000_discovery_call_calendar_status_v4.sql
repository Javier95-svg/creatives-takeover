-- Discovery Call V4 adds a durable boundary between agreeing on a time and
-- charging the founder. PostgreSQL enum values must be committed before they
-- can be referenced by the following migration, so this change is isolated.

ALTER TYPE public.discovery_call_status
  ADD VALUE IF NOT EXISTS 'pending_meeting_creation' AFTER 'pending_founder_response';

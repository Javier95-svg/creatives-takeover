-- Enum changes must commit before a following migration uses the new value.
ALTER TYPE public.discovery_call_status ADD VALUE IF NOT EXISTS 'expired';

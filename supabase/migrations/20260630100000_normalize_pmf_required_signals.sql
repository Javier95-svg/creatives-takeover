-- PMF Lab production readiness:
-- The live PMF Lab threshold is 25 interviews/signals. Older rows and the original
-- table default used 5, so normalize existing evidence rows and future defaults.

ALTER TABLE public.pmf_validation_evidence
  ALTER COLUMN required_signals SET DEFAULT 25;

UPDATE public.pmf_validation_evidence
SET required_signals = 25
WHERE required_signals < 25;

-- Remove 500 Global from Accelerator Hunt
UPDATE public.funding_opportunities
SET is_active = false
WHERE title = '500 Global' AND type = 'accelerator';

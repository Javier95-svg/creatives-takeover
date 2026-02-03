-- Remove accelerators from the investors (VC Search) table
-- Y Combinator and Techstars are accelerators, not VCs.
-- They already exist in the funding_opportunities table as type='accelerator'.

UPDATE public.investors
SET is_active = false
WHERE firm_name IN ('Y Combinator', 'Techstars');

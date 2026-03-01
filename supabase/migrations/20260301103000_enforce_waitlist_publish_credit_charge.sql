-- Enforce waitlist publishing credits at the database layer.
-- This prevents published waitlist pages from bypassing the credit system.

CREATE OR REPLACE FUNCTION public.enforce_waitlist_publish_credit_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charge_result jsonb;
  should_charge boolean;
BEGIN
  should_charge :=
    NEW.status = 'published'
    AND (
      TG_OP = 'INSERT'
      OR COALESCE(OLD.status, 'draft') <> 'published'
    );

  IF NOT should_charge THEN
    RETURN NEW;
  END IF;

  charge_result := public.deduct_credits_atomic(
    NEW.user_id,
    3,
    'Waitlist Page Generation',
    NULL,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', 'waitlist_publish_trigger',
        'waitlistPageId', NEW.id,
        'slug', NEW.slug
      )
    )
  );

  IF COALESCE((charge_result ->> 'success')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF charge_result ->> 'errorCode' = 'INSUFFICIENT_CREDITS' THEN
    RAISE EXCEPTION 'Insufficient credits. Publishing a waitlist page requires 3 credits.';
  END IF;

  RAISE EXCEPTION 'Waitlist publish credit deduction failed: %',
    COALESCE(charge_result ->> 'error', 'Unknown error');
END;
$$;

DROP TRIGGER IF EXISTS enforce_waitlist_publish_credit_charge ON public.waitlist_pages;

CREATE TRIGGER enforce_waitlist_publish_credit_charge
BEFORE INSERT OR UPDATE OF status
ON public.waitlist_pages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_waitlist_publish_credit_charge();

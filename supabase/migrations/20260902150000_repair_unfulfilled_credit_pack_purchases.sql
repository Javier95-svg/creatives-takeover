-- Repair credit-pack Checkout Sessions that Stripe marked completed but that
-- were not fulfilled because the webhook treated the Supabase RPC response
-- envelope as the idempotency status itself. The credit-transaction check is
-- the durable idempotency guard, so this migration is safe to run more than once.
DO $$
DECLARE
  v_purchase record;
  v_idempotency_key text;
BEGIN
  FOR v_purchase IN
    SELECT
      checkout_session.stripe_session_id,
      checkout_session.user_id,
      checkout_session.pack_id,
      checkout_session.purchase_source,
      credit_pack.credits,
      credit_pack.label,
      credit_pack.price_cents,
      COALESCE(
        NULLIF(webhook_event.payload #>> '{data,object,payment_intent}', ''),
        checkout_session.stripe_session_id
      ) AS purchase_reference
    FROM public.stripe_checkout_sessions AS checkout_session
    JOIN public.credit_packs AS credit_pack
      ON credit_pack.id = checkout_session.pack_id
      AND credit_pack.active = true
    LEFT JOIN public.stripe_webhook_events AS webhook_event
      ON webhook_event.event_id = checkout_session.terminal_event_id
    WHERE checkout_session.purchase_type = 'credit_pack'
      AND checkout_session.status = 'completed'
      AND COALESCE(webhook_event.event_type, checkout_session.terminal_event_type) = 'checkout.session.completed'
  LOOP
    v_idempotency_key := 'stripe:platform:credit_purchase:' || v_purchase.purchase_reference;

    IF EXISTS (
      SELECT 1
      FROM public.credit_transactions AS transaction
      WHERE transaction.user_id = v_purchase.user_id
        AND transaction.tx_type = 'purchase'
        AND transaction.metadata ->> 'idempotencyKey' = v_idempotency_key
    ) THEN
      PERFORM public.idempotency_mark_completed(
        v_idempotency_key,
        jsonb_build_object(
          'status', 'credited',
          'userId', v_purchase.user_id,
          'creditsAdded', v_purchase.credits,
          'packId', v_purchase.pack_id,
          'wallet', 'platform',
          'stripeSessionId', v_purchase.stripe_session_id
        )
      );
      CONTINUE;
    END IF;

    UPDATE public.user_credits
    SET balance = balance + v_purchase.credits,
        updated_at = now()
    WHERE user_id = v_purchase.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Credit wallet not found for completed credit-pack checkout %', v_purchase.stripe_session_id;
    END IF;

    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata
    ) VALUES (
      v_purchase.user_id,
      v_purchase.credits,
      'purchase',
      format('Credit pack purchase: %s (%s credits)', v_purchase.pack_id, v_purchase.credits),
      'Credit Pack',
      jsonb_build_object(
        'idempotencyKey', v_idempotency_key,
        'packId', v_purchase.pack_id,
        'packLabel', v_purchase.label,
        'creditsAdded', v_purchase.credits,
        'priceCents', v_purchase.price_cents,
        'purchaseSource', v_purchase.purchase_source,
        'stripeSessionId', v_purchase.stripe_session_id,
        'sourceEventType', 'credit_pack_fulfillment_repair',
        'wallet', 'platform'
      )
    );

    PERFORM public.idempotency_mark_completed(
      v_idempotency_key,
      jsonb_build_object(
        'status', 'credited',
        'userId', v_purchase.user_id,
        'creditsAdded', v_purchase.credits,
        'packId', v_purchase.pack_id,
        'wallet', 'platform',
        'stripeSessionId', v_purchase.stripe_session_id,
        'repaired', true
      )
    );
  END LOOP;
END;
$$;

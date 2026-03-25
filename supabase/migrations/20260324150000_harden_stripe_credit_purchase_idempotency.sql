CREATE INDEX IF NOT EXISTS credit_transactions_purchase_lookup_idx
ON public.credit_transactions (user_id, feature, created_at DESC)
WHERE tx_type = 'purchase';

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_purchase_idempotency_unique_idx
ON public.credit_transactions (user_id, feature, (metadata ->> 'idempotencyKey'))
WHERE tx_type = 'purchase'
  AND metadata ? 'idempotencyKey';

# Credit System Deep Audit Query Appendix

Audit window:

```sql
-- Inclusive lower bound, exclusive upper bound for complete-day analysis.
-- 2026-02-13 through 2026-05-14 America/Bogota should be adjusted if warehouse stores local timestamps.
WITH params AS (
  SELECT
    TIMESTAMPTZ '2026-02-13 00:00:00+00' AS start_at,
    TIMESTAMPTZ '2026-05-15 00:00:00+00' AS end_at
)
SELECT * FROM params;
```

## Supabase SQL

### 1. Credit ledger summary by product-facing feature

```sql
WITH params AS (
  SELECT TIMESTAMPTZ '2026-02-13 00:00:00+00' AS start_at,
         TIMESTAMPTZ '2026-05-15 00:00:00+00' AS end_at
),
product_features(feature) AS (
  VALUES
    ('ICP Analysis'),
    ('ICP Builder'),
    ('Waitlist Page Generation'),
    ('Waitlist Maker'),
    ('PMF Analysis'),
    ('PMF Evidence Analysis'),
    ('Product-Market Fit Lab'),
    ('APP_BUILDER_GENERATE'),
    ('APP_BUILDER_REFINE'),
    ('MVP Builder'),
    ('Tech Stack Generation'),
    ('Tech Stack Builder'),
    ('GTM Analysis'),
    ('GTM Strategist'),
    ('Directories'),
    ('VC Search'),
    ('Accelerator Hunt'),
    ('Email Templates'),
    ('Pitch Deck Analyzer'),
    ('Fundraising Readiness Analysis'),
    ('Insighta Test'),
    ('Discovery Call'),
    ('Find a Co-Founder Posting'),
    ('Find Your Angel'),
    ('Newspaper'),
    ('Prompt Generation'),
    ('Prompt Library')
)
SELECT
  COALESCE(ct.feature, '(null)') AS feature,
  ct.tx_type,
  ct.amount,
  ct.reason,
  COUNT(*) AS tx_count,
  COUNT(DISTINCT ct.user_id) AS users,
  SUM(
    CASE
      WHEN ct.tx_type IN ('deduct', 'stake') THEN -ABS(ct.amount)
      WHEN ct.tx_type IN ('grant', 'purchase', 'refund', 'reset', 'adjustment') THEN ct.amount
      ELSE ct.amount
    END
  ) AS signed_credit_delta,
  MIN(ct.created_at) AS first_seen,
  MAX(ct.created_at) AS last_seen
FROM public.credit_transactions ct
CROSS JOIN params
JOIN product_features pf ON pf.feature = ct.feature
WHERE ct.created_at >= params.start_at
  AND ct.created_at < params.end_at
GROUP BY 1, 2, 3, 4
ORDER BY ABS(SUM(
  CASE
    WHEN ct.tx_type IN ('deduct', 'stake') THEN -ABS(ct.amount)
    WHEN ct.tx_type IN ('grant', 'purchase', 'refund', 'reset', 'adjustment') THEN ct.amount
    ELSE ct.amount
  END
)) DESC, tx_count DESC;
```

### 2. Off-table or unmapped ledger features

Use this to identify legacy/internal deductions that should not appear in the board-facing product inventory unless the Compare Our Plans table is expanded.

```sql
WITH product_features(feature) AS (
  VALUES
    ('ICP Analysis'),
    ('ICP Builder'),
    ('Waitlist Page Generation'),
    ('Waitlist Maker'),
    ('PMF Analysis'),
    ('PMF Evidence Analysis'),
    ('Product-Market Fit Lab'),
    ('APP_BUILDER_GENERATE'),
    ('APP_BUILDER_REFINE'),
    ('MVP Builder'),
    ('Tech Stack Generation'),
    ('Tech Stack Builder'),
    ('GTM Analysis'),
    ('GTM Strategist'),
    ('Directories'),
    ('VC Search'),
    ('Accelerator Hunt'),
    ('Email Templates'),
    ('Pitch Deck Analyzer'),
    ('Fundraising Readiness Analysis'),
    ('Insighta Test'),
    ('Discovery Call'),
    ('Find a Co-Founder Posting'),
    ('Find Your Angel'),
    ('Newspaper'),
    ('Prompt Generation'),
    ('Prompt Library'),
    ('Monthly Quota Reset'),
    ('Account Creation'),
    ('Credit Purchase'),
    ('Subscription Grant')
),
params AS (
  SELECT TIMESTAMPTZ '2026-02-13 00:00:00+00' AS start_at,
         TIMESTAMPTZ '2026-05-15 00:00:00+00' AS end_at
)
SELECT
  COALESCE(ct.feature, '(null)') AS feature,
  ct.reason,
  ct.tx_type,
  ct.amount,
  COUNT(*) AS tx_count,
  COUNT(DISTINCT ct.user_id) AS users
FROM public.credit_transactions ct
CROSS JOIN params
LEFT JOIN product_features pf ON pf.feature = ct.feature
WHERE ct.created_at >= params.start_at
  AND ct.created_at < params.end_at
  AND pf.feature IS NULL
GROUP BY 1, 2, 3, 4
ORDER BY tx_count DESC;
```

### 3. Credit consumption by plan and product-facing feature

```sql
WITH params AS (
  SELECT TIMESTAMPTZ '2026-02-13 00:00:00+00' AS start_at,
         TIMESTAMPTZ '2026-05-15 00:00:00+00' AS end_at
),
product_features(feature) AS (
  VALUES
    ('ICP Analysis'),
    ('Waitlist Page Generation'),
    ('PMF Analysis'),
    ('PMF Evidence Analysis'),
    ('APP_BUILDER_GENERATE'),
    ('APP_BUILDER_REFINE'),
    ('Tech Stack Generation'),
    ('GTM Analysis'),
    ('Pitch Deck Analyzer'),
    ('Fundraising Readiness Analysis'),
    ('Discovery Call'),
    ('Prompt Generation')
)
SELECT
  COALESCE(uc.subscription_tier, p.subscription_tier, 'unknown') AS plan,
  COALESCE(ct.feature, '(null)') AS feature,
  COUNT(*) FILTER (WHERE ct.tx_type = 'deduct') AS deductions,
  COUNT(DISTINCT ct.user_id) FILTER (WHERE ct.tx_type = 'deduct') AS deducting_users,
  SUM(ABS(ct.amount)) FILTER (WHERE ct.tx_type = 'deduct') AS credits_deducted,
  COUNT(*) FILTER (WHERE ct.tx_type = 'refund') AS refunds,
  SUM(ct.amount) FILTER (WHERE ct.tx_type = 'refund') AS credits_refunded
FROM public.credit_transactions ct
CROSS JOIN params
JOIN product_features pf ON pf.feature = ct.feature
LEFT JOIN public.user_credits uc ON uc.user_id = ct.user_id
LEFT JOIN public.profiles p ON p.id = ct.user_id
WHERE ct.created_at >= params.start_at
  AND ct.created_at < params.end_at
GROUP BY 1, 2
ORDER BY credits_deducted DESC NULLS LAST;
```

### 4. Current credit exhaustion by plan

```sql
SELECT
  COALESCE(subscription_tier, 'unknown') AS plan,
  COUNT(*) AS users,
  COUNT(*) FILTER (WHERE COALESCE(balance, 0) + COALESCE(monthly_quota, 0) = 0) AS zero_credit_users,
  COUNT(*) FILTER (WHERE COALESCE(balance, 0) + COALESCE(monthly_quota, 0) BETWEEN 1 AND 20) AS low_credit_users,
  AVG(COALESCE(balance, 0) + COALESCE(monthly_quota, 0)) AS avg_total_available,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY COALESCE(balance, 0) + COALESCE(monthly_quota, 0)) AS median_total_available
FROM public.user_credits
GROUP BY 1
ORDER BY users DESC;
```

### 5. Activity and page analytics by product route

```sql
WITH params AS (
  SELECT TIMESTAMPTZ '2026-02-13 00:00:00+00' AS start_at,
         TIMESTAMPTZ '2026-05-15 00:00:00+00' AS end_at
)
SELECT
  page_path,
  event_type,
  COUNT(*) AS events,
  COUNT(DISTINCT user_id) AS users,
  COUNT(DISTINCT session_id) AS sessions,
  AVG(time_spent) AS avg_time_spent
FROM public.page_analytics, params
WHERE created_at >= params.start_at
  AND created_at < params.end_at
  AND (
    page_path ILIKE '%icp%'
    OR page_path ILIKE '%waitlist%'
    OR page_path ILIKE '%pmf%'
    OR page_path ILIKE '%mvp%'
    OR page_path ILIKE '%tech-stack%'
    OR page_path ILIKE '%go-to-market%'
    OR page_path ILIKE '%directories%'
    OR page_path ILIKE '%vc%'
    OR page_path ILIKE '%accelerator%'
    OR page_path ILIKE '%pitch%'
    OR page_path ILIKE '%mentor%'
    OR page_path ILIKE '%co-founder%'
    OR page_path ILIKE '%angel%'
    OR page_path ILIKE '%prompt%'
    OR page_path ILIKE '%newspaper%'
  )
GROUP BY 1, 2
ORDER BY events DESC;
```

### 6. Upgrade prompt to conversion join

Current code sends `upgrade_prompt_shown` and `upgrade_clicked` to PostHog via `captureEvent`; it does not mirror those events into `activity_events` by default. Use this Supabase query only if those events are later mirrored into Supabase. Otherwise, run the PostHog query below and join exported results to Supabase/Stripe by user id.

```sql
WITH prompts AS (
  SELECT
    user_id,
    created_at AS prompt_at,
    properties ->> 'trigger' AS trigger,
    properties ->> 'target_plan' AS target_plan,
    (properties ->> 'credits_remaining')::INTEGER AS credits_remaining
  FROM public.activity_events
  WHERE event = 'upgrade_prompt_shown'
    AND created_at >= TIMESTAMPTZ '2026-02-13 00:00:00+00'
    AND created_at < TIMESTAMPTZ '2026-05-15 00:00:00+00'
),
subscriptions AS (
  SELECT
    user_id,
    updated_at,
    subscription_tier,
    subscribed
  FROM public.subscribers
)
SELECT
  p.trigger,
  p.target_plan,
  COUNT(*) AS prompts,
  COUNT(DISTINCT p.user_id) AS prompted_users,
  COUNT(DISTINCT s.user_id) FILTER (
    WHERE s.subscribed = true
      AND s.updated_at >= p.prompt_at
      AND s.updated_at < p.prompt_at + INTERVAL '7 days'
  ) AS converted_within_7d
FROM prompts p
LEFT JOIN subscriptions s ON s.user_id = p.user_id
GROUP BY 1, 2
ORDER BY prompts DESC;
```

## PostHog HogQL

Run in PostHog SQL/HogQL.

```sql
SELECT
  event,
  count() AS events,
  count(DISTINCT person_id) AS users
FROM events
WHERE timestamp >= toDateTime('2026-02-13 00:00:00')
  AND timestamp < toDateTime('2026-05-15 00:00:00')
  AND event IN (
    'upgrade_prompt_shown',
    'upgrade_clicked',
    'pricing_viewed',
    'activation_completed',
    'icp_builder_started',
    'icp_builder_completed',
    'waitlist_created',
    'pmf_analysis_started',
    'pmf_analysis_completed',
    'mvp_builder_started',
    'mvp_builder_completed',
    'gtm_strategy_started',
    'gtm_strategy_completed',
    'pitch_deck_analyzer_started',
    'pitch_deck_analyzer_completed',
    'prompt_library_used',
    'tool_first_use'
  )
GROUP BY event
ORDER BY events DESC;
```

```sql
SELECT
  properties.trigger AS trigger,
  properties.current_plan AS current_plan,
  properties.target_plan AS target_plan,
  count() AS prompts,
  count(DISTINCT person_id) AS users
FROM events
WHERE timestamp >= toDateTime('2026-02-13 00:00:00')
  AND timestamp < toDateTime('2026-05-15 00:00:00')
  AND event = 'upgrade_prompt_shown'
GROUP BY trigger, current_plan, target_plan
ORDER BY prompts DESC;
```

## Amplitude Export API

Use only if Amplitude is instrumented for this product.

```bash
curl -u "$AMPLITUDE_API_KEY:$AMPLITUDE_SECRET_KEY" \
  "https://amplitude.com/api/2/export?start=20260213T00&end=20260514T23" \
  --output amplitude-export-20260213-20260514.zip
```

Expected analysis after export:

- Filter events matching tool starts/completions/abandons.
- Group by `user_id`, `device_id`, event type, and plan properties.
- Join by user id to Supabase users and Stripe customers where available.

## Stripe API

Use live mode only for production analysis.

```bash
stripe checkout sessions list \
  --created[gte]=1770940800 \
  --created[lt]=1778803200 \
  --limit=100
```

```bash
stripe subscriptions search \
  --query "created>=1770940800 AND created<1778803200" \
  --limit=100
```

```bash
stripe charges search \
  --query "created>=1770940800 AND created<1778803200" \
  --limit=100
```

Fields to export:

- `id`, `customer`, `customer_email`, `client_reference_id`, `metadata.user_id`
- `mode`, `payment_status`, `subscription`, `amount_total`
- line item price id, product id, recurring interval
- subscription status, cancel date, current period start/end
- charge amount, refunded, disputed, receipt email

Join order:

1. `metadata.user_id`
2. `client_reference_id`
3. `stripe_customer_id`
4. normalized email

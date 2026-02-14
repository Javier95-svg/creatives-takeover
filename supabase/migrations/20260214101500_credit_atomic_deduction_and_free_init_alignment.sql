-- Ensure new users start with the documented free-tier monthly allocation model:
-- monthly_quota = 25, balance = 0.
create or replace function public.create_user_credits_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_user_id uuid;
begin
  insert into public.user_credits (user_id, balance, monthly_quota, subscription_tier, last_reset_at)
  values (new.id, 0, 25, 'free', now())
  on conflict (user_id) do nothing
  returning user_id into inserted_user_id;

  if inserted_user_id is not null then
    insert into public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature,
      metadata
    ) values (
      new.id,
      25,
      'grant',
      'Monthly free-tier allocation on signup',
      'Account Creation',
      jsonb_build_object('grantType', 'monthly_quota', 'quotaGranted', 25)
    );
  end if;

  return new;
end;
$$;

-- Perform credit deduction and transaction logging in one DB transaction.
create or replace function public.deduct_credits_atomic(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_monthly_quota integer;
  v_total_available integer;
  v_used_from_quota integer := 0;
  v_used_from_balance integer := 0;
  v_new_balance integer;
  v_new_quota integer;
  v_idempotency_key text;
  v_session_uuid uuid;
  v_existing_tx record;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid credit amount',
      'errorCode', 'DEDUCTION_FAILED'
    );
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_metadata ->> 'idempotencyKey', '')), '');

  -- Fast replay path for duplicate idempotent calls.
  if v_idempotency_key is not null then
    select *
      into v_existing_tx
      from public.credit_transactions
     where user_id = p_user_id
       and tx_type = 'deduct'
       and feature = p_feature
       and metadata ->> 'idempotencyKey' = v_idempotency_key
     order by created_at desc
     limit 1;

    if found then
      select balance, monthly_quota
        into v_balance, v_monthly_quota
        from public.user_credits
       where user_id = p_user_id;

      return jsonb_build_object(
        'success', true,
        'newBalance', coalesce(v_balance, 0),
        'newQuota', coalesce(v_monthly_quota, 0),
        'usedFromQuota', coalesce((v_existing_tx.metadata ->> 'usedFromQuota')::integer, 0),
        'usedFromBalance', coalesce((v_existing_tx.metadata ->> 'usedFromBalance')::integer, 0)
      );
    end if;
  end if;

  select balance, monthly_quota
    into v_balance, v_monthly_quota
    from public.user_credits
   where user_id = p_user_id
   for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'User credit record not found',
      'errorCode', 'USER_NOT_FOUND'
    );
  end if;

  v_total_available := coalesce(v_balance, 0) + coalesce(v_monthly_quota, 0);

  if v_total_available < p_amount then
    return jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'errorCode', 'INSUFFICIENT_CREDITS'
    );
  end if;

  if v_monthly_quota >= p_amount then
    v_used_from_quota := p_amount;
    v_used_from_balance := 0;
    v_new_quota := v_monthly_quota - p_amount;
    v_new_balance := v_balance;
  else
    v_used_from_quota := v_monthly_quota;
    v_used_from_balance := p_amount - v_monthly_quota;
    v_new_quota := 0;
    v_new_balance := v_balance - v_used_from_balance;
  end if;

  update public.user_credits
     set monthly_quota = v_new_quota,
         balance = v_new_balance
   where user_id = p_user_id;

  v_session_uuid := null;
  if p_session_id is not null
     and p_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    v_session_uuid := p_session_id::uuid;
  end if;

  insert into public.credit_transactions (
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    session_id,
    metadata
  ) values (
    p_user_id,
    -p_amount,
    'deduct',
    format('Used %s credits for %s', p_amount, p_feature),
    p_feature,
    v_session_uuid,
    jsonb_strip_nulls(
      coalesce(p_metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'usedFromQuota', v_used_from_quota,
        'usedFromBalance', v_used_from_balance,
        'quotaRemaining', v_new_quota,
        'balanceRemaining', v_new_balance
      )
    )
  );

  return jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance,
    'newQuota', v_new_quota,
    'usedFromQuota', v_used_from_quota,
    'usedFromBalance', v_used_from_balance
  );
exception
  when unique_violation then
    if v_idempotency_key is not null then
      select *
        into v_existing_tx
        from public.credit_transactions
       where user_id = p_user_id
         and tx_type = 'deduct'
         and feature = p_feature
         and metadata ->> 'idempotencyKey' = v_idempotency_key
       order by created_at desc
       limit 1;

      if found then
        select balance, monthly_quota
          into v_balance, v_monthly_quota
          from public.user_credits
         where user_id = p_user_id;

        return jsonb_build_object(
          'success', true,
          'newBalance', coalesce(v_balance, 0),
          'newQuota', coalesce(v_monthly_quota, 0),
          'usedFromQuota', coalesce((v_existing_tx.metadata ->> 'usedFromQuota')::integer, 0),
          'usedFromBalance', coalesce((v_existing_tx.metadata ->> 'usedFromBalance')::integer, 0)
        );
      end if;
    end if;

    return jsonb_build_object(
      'success', false,
      'error', 'Duplicate transaction conflict',
      'errorCode', 'DEDUCTION_FAILED'
    );
  when others then
    return jsonb_build_object(
      'success', false,
      'error', coalesce(SQLERRM, 'Transaction failed'),
      'errorCode', 'DEDUCTION_FAILED'
    );
end;
$$;

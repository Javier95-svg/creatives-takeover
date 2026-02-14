-- Strengthen idempotency primitives for atomic begin/complete semantics.
create or replace function public.idempotency_try_begin(p_id text)
returns text
language plpgsql
as $$
declare
  current_status text;
begin
  insert into public.function_idempotency(id, status)
  values (p_id, 'processing')
  on conflict do nothing;

  if found then
    return 'started';
  end if;

  select status into current_status
  from public.function_idempotency
  where id = p_id;

  if current_status = 'completed' then
    return 'completed';
  end if;

  return 'processing';
end;
$$;

create or replace function public.idempotency_mark_completed(p_id text, p_result jsonb)
returns void
language sql
as $$
  update public.function_idempotency
  set result = p_result,
      status = 'completed',
      created_at = now()
  where id = p_id;
$$;

create or replace function public.idempotency_clear(p_id text)
returns void
language sql
as $$
  delete from public.function_idempotency
  where id = p_id
    and status <> 'completed';
$$;

-- Enable fast lookup and enforce one deduct transaction per idempotency key.
create index if not exists credit_transactions_deduct_lookup_idx
on public.credit_transactions (user_id, feature, created_at desc)
where tx_type = 'deduct';

create unique index if not exists credit_transactions_deduct_idempotency_unique_idx
on public.credit_transactions (user_id, feature, (metadata ->> 'idempotencyKey'))
where tx_type = 'deduct'
  and metadata ? 'idempotencyKey';

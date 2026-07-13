-- Cross-founder traction benchmarks by product category. Aggregate-only
-- (percentiles + cohort size), SECURITY DEFINER so it can read across users,
-- and it returns nothing until the cohort has at least 10 distinct founders —
-- no individual founder's data is ever inferable. Groundwork for the
-- channel-outcome flywheel: the same logs later power empirical channel priors.

create or replace function public.get_traction_category_benchmarks(p_category text)
returns table (
  cohort_users integer,
  p25 numeric,
  p50 numeric,
  p75 numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with cohort as (
    select user_id, combined_score
    from public.traction_engine_weekly_logs
    where product_category = p_category
      and week_start_date >= current_date - 180
  ),
  sized as (
    select count(distinct user_id) as users from cohort
  )
  select
    sized.users::integer,
    percentile_cont(0.25) within group (order by cohort.combined_score)::numeric(5,1),
    percentile_cont(0.50) within group (order by cohort.combined_score)::numeric(5,1),
    percentile_cont(0.75) within group (order by cohort.combined_score)::numeric(5,1)
  from cohort, sized
  group by sized.users
  having sized.users >= 10;
$$;

revoke all on function public.get_traction_category_benchmarks(text) from public;
grant execute on function public.get_traction_category_benchmarks(text) to authenticated;

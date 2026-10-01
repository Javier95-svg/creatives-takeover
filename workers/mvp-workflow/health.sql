-- Operator-only, read-only queue and pilot diagnostics. No source or credentials.
SELECT jsonb_build_object(
 'worker', (SELECT jsonb_build_object('last_seen',last_seen,'fresh',last_seen>now()-interval '2 minutes','profiles',profiles) FROM public.mvp_workflow_worker_health WHERE id),
 'queued',(SELECT count(*) FROM public.mvp_build_tests WHERE status='queued'),
 'running',(SELECT count(*) FROM public.mvp_build_tests WHERE status='running'),
 'expired_leases',(SELECT count(*) FROM public.mvp_build_tests WHERE status='running' AND lease_until<now()),
 'oldest_queued',(SELECT min(created_at) FROM public.mvp_build_tests WHERE status='queued'),
 'failed_last_day',(SELECT count(*) FROM public.mvp_build_tests WHERE status='failed' AND finished_at>now()-interval '1 day'),
 'managed_review_needed',(SELECT count(*) FROM public.mvp_managed_apps WHERE status IN ('review','failed')),
 'pilot', (SELECT jsonb_build_object('enabled',enabled,'forecast_age',now()-cost_observed_at,'projected_monthly_cents',base_monthly_cents+(SELECT coalesce(sum(reserved_monthly_cents),0) FROM public.mvp_managed_apps)) FROM public.mvp_managed_pilot WHERE id),
 'budget_alerts_last_day',(SELECT count(*) FROM public.mvp_managed_events WHERE kind='budget_alert' AND created_at>now()-interval '1 day')
) AS release_health;

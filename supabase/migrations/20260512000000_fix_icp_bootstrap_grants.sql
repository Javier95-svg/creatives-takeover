-- ============================================================
-- Fix ICP bootstrap: add explicit GRANTs on tables written by
-- bootstrap-icp-dashboard edge function.
--
-- The May 9 security hardening ran REVOKE ALL on several tables
-- and only restored SELECT for authenticated users on some.
-- The bootstrap function uses service_role (bypasses RLS) but
-- PostgREST still validates table-level privileges when the
-- schema cache is built. Missing GRANTs cause intermittent 400
-- errors from bootstrap-icp-dashboard, which the frontend was
-- previously re-raising as icp_draft_generation_failed.
-- ============================================================

-- daily_tasks: bootstrap inserts rows, so authenticated also needs
-- INSERT/UPDATE/DELETE for the user's own task management UI.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_tasks
  TO authenticated;
GRANT ALL ON TABLE public.daily_tasks TO service_role;

-- personalized_recommendations: bootstrap inserts rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personalized_recommendations
  TO authenticated;
GRANT ALL ON TABLE public.personalized_recommendations TO service_role;

-- dashboard_files: bootstrap upserts rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dashboard_files
  TO authenticated;
GRANT ALL ON TABLE public.dashboard_files TO service_role;

-- icp_analysis_results: bootstrap reads rows; frontend reads them too.
GRANT SELECT ON TABLE public.icp_analysis_results TO authenticated;
GRANT ALL    ON TABLE public.icp_analysis_results TO service_role;

NOTIFY pgrst, 'reload schema';

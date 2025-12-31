-- ============================================================================
-- VERIFICATION QUERIES FOR PHASE 1 MIGRATION
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify the migration worked
-- ============================================================================

-- 1. Check if new tables exist
SELECT
  'Tables Status' as check_type,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_missions') as weekly_missions_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_mission_tasks') as weekly_mission_tasks_exists;

-- 2. Check if new columns were added to daily_check_ins
SELECT
  'daily_check_ins Columns' as check_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'goal_achieved') as goal_achieved_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'what_went_well') as what_went_well_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'what_blocked_you') as what_blocked_you_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'energy_level_end') as energy_level_end_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_check_ins' AND column_name = 'tomorrow_focus') as tomorrow_focus_exists;

-- 3. Check if new columns were added to daily_tasks
SELECT
  'daily_tasks Columns' as check_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'business_impact_score') as business_impact_score_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'effort_estimate') as effort_estimate_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'stage_alignment_score') as stage_alignment_score_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'blocks_task_ids') as blocks_task_ids_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'contributes_to_weekly_mission') as contributes_to_weekly_mission_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'ai_generated') as ai_generated_exists;

-- 4. Check if new columns were added to profiles
SELECT
  'profiles Columns' as check_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_dashboard_mode') as preferred_dashboard_mode_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'use_classic_dashboard') as use_classic_dashboard_exists;

-- 5. Check if RLS policies exist
SELECT
  'RLS Policies' as check_type,
  COUNT(*) FILTER (WHERE tablename = 'weekly_missions') as weekly_missions_policies,
  COUNT(*) FILTER (WHERE tablename = 'weekly_mission_tasks') as weekly_mission_tasks_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('weekly_missions', 'weekly_mission_tasks');

-- 6. Check if the trigger function exists
SELECT
  'Trigger Function' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'update_weekly_mission_progress'
  ) as trigger_function_exists;

-- 7. Check if the trigger exists
SELECT
  'Trigger' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name = 'trigger_update_mission_progress'
  ) as trigger_exists;

-- ============================================================================
-- EXPECTED RESULTS:
-- All *_exists columns should return TRUE
-- weekly_missions_policies should be 4 (SELECT, INSERT, UPDATE, DELETE)
-- weekly_mission_tasks_policies should be 4 (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================

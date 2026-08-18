-- Speeds up saving an angel investor.
--
-- notify_all_users_on_new_angel_banner() fans out one community_notifications
-- row per user inside the INSERT transaction. Its NOT EXISTS dedup guard had no
-- supporting index, so every save seq-scanned all ~47k notification rows and
-- deref'd metadata->>'angel_id' on each one.
--
-- Measured on production before/after:
--   before: Seq Scan, 47,636 rows removed by filter -- 2,059 ms
--   after:  Index Scan, 3 buffer hits               --    32 ms
--
-- Expression column leads so the index can seek on angel_id; user_id follows to
-- satisfy the anti-join. Partial on notification_type keeps it small.
--
-- NOTE: applied directly to the live DB via MCP on 2026-08-18 (using
-- CONCURRENTLY, so no locks were taken), because the Actions-billing lock means
-- CI cannot deploy migrations. This file exists to keep the repo in sync with
-- the remote schema, and is a no-op against production.
--
-- CONCURRENTLY is deliberately NOT used here: the CLI wraps each migration in a
-- transaction and CREATE INDEX CONCURRENTLY cannot run inside one. On the live
-- DB the IF NOT EXISTS makes this a no-op; on a fresh DB the brief lock is fine.

CREATE INDEX IF NOT EXISTS idx_community_notifications_angel_dedup_v2
  ON public.community_notifications ((COALESCE(metadata->>'angel_id', '')), user_id)
  WHERE notification_type = 'angel_banner_created';

DROP INDEX IF EXISTS public.idx_community_notifications_angel_banner_dedup;

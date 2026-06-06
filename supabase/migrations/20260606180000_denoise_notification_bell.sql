-- Retention P1: de-noise the in-app notification bell.
--
-- Audit finding: 97% of all in-app notifications (8,183 of 8,404 in 30 days) were
-- all-users broadcasts at a 2% read rate, while the high-signal personal ones
-- (DMs 61%, task-deadline 62%) were buried. The bell was being trained into
-- irrelevance, so it no longer drives users back to act on tasks or mentors.
--
-- The three offenders insert ONE notification per user on every new angel,
-- mentor, and article (the newspaper one even re-blasts everyone on every edit).
-- None carry unique value — the content is already discoverable on the Newspaper,
-- Find a Mentor, and Find your Angel pages.
--
-- Stop the broadcasts (keep the functions so they can be repurposed into an
-- opt-in "What's new" digest later) and clear the accumulated noise so every
-- user gets a clean, signal-only bell.

DROP TRIGGER IF EXISTS on_new_mentor_banner_notify_all_users ON public.mentors;
DROP TRIGGER IF EXISTS on_new_angel_banner_notify_all_users ON public.angel_investors;
DROP TRIGGER IF EXISTS on_newspaper_publish_notify_all_users ON public.stories_articles;

-- NOTE: clearing the ~8k already-accumulated broadcast rows (mark-as-read) is a
-- separate one-time data cleanup run out-of-band with explicit approval; it is
-- intentionally not part of this migration.

-- Demo Studio lead routing: let founders forward launch-page signups to a webhook
-- (Slack/Zapier/Make/Sheets) and toggle the owner email notification. Routing is
-- performed server-side by the demo-studio-lead edge function so the webhook URL is
-- never exposed to the public launch page.

ALTER TABLE public.demo_studio_launch_pages
  ADD COLUMN IF NOT EXISTS lead_webhook_url text,
  ADD COLUMN IF NOT EXISTS lead_notify_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.demo_studio_launch_pages.lead_webhook_url IS
  'Optional outbound webhook (Slack/Zapier/Make/Sheets) POSTed with each signup by the demo-studio-lead edge function.';
COMMENT ON COLUMN public.demo_studio_launch_pages.lead_notify_enabled IS
  'When true, the project owner is emailed on each new launch-page signup.';

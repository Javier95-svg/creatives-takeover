-- Retention P1: web push — the missing channel that reaches a user's device with
-- the tab closed (the #1 enabler of daily return). Pairs with the de-noised bell:
-- since only signal notifications remain, bridging every in-app notification to a
-- web push is appropriate.

-- 1. Device subscriptions (one row per browser/device per user).
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Bridge: every in-app notification also fires a web push to that user's
--    devices. Non-blocking; the bell insert never fails because of push.
CREATE OR REPLACE FUNCTION public.push_on_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only push if the user actually has a device subscribed (avoids wasted calls).
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', 'Creatives Takeover',
        'message', COALESCE(NEW.metadata->>'message', 'You have a new update'),
        'url', COALESCE(NEW.metadata->>'route', '/dashboard'),
        'tag', NEW.notification_type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[push_on_new_notification] non-fatal failure user=% msg=%', NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_new_notification ON public.community_notifications;
CREATE TRIGGER trg_push_on_new_notification
  AFTER INSERT ON public.community_notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_on_new_notification();

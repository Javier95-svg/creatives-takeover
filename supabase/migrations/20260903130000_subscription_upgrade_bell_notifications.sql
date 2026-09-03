-- A Stripe event can be delivered more than once. Keep one bell notification
-- per user and Stripe checkout event while allowing normal notifications to
-- remain unrestricted.
CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_subscription_upgrade_event_unique
  ON public.community_notifications (
    user_id,
    notification_type,
    (metadata ->> 'stripe_event_id')
  )
  WHERE notification_type = 'subscription_upgrade_completed'
    AND metadata ? 'stripe_event_id';

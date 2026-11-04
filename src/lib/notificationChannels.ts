import type { UserType } from './accountTypes.ts';

/**
 * The notification channels each account type is offered.
 *
 * Everyone gets the shared ones. The category channels are only shown to the
 * type they belong to, because offering a founder a "discovery call requests"
 * toggle implies they receive discovery call requests, and they do not.
 *
 * A sixth type is one entry here.
 */

export interface NotificationChannel {
  /** The notification_preferences column, which is also what notif_pref_enabled reads. */
  key: string;
  label: string;
  description: string;
}

export const SHARED_CHANNELS: readonly NotificationChannel[] = [
  { key: 'dm_email_enabled', label: 'Message emails', description: 'Email me when someone sends a direct message.' },
  { key: 'connection_request_email_enabled', label: 'Connection request emails', description: 'Email me when someone sends me a connection request.' },
  { key: 'dm_push_enabled', label: 'Message push notifications', description: 'Send direct-message alerts to subscribed devices.' },
  { key: 'routine_in_app_enabled', label: 'Routine in-app reminders', description: 'Show routine nudges in the platform at your selected routine time.' },
  { key: 'routine_email_enabled', label: 'Routine email fallback', description: 'Email a recovery nudge after three inactive days, if your routine is enabled.' },
  { key: 'task_reminders', label: 'Task & deadline notifications', description: 'Show task alerts in the platform.' },
  { key: 'task_email_enabled', label: 'Task reminder emails', description: 'Email me about tasks that are due or overdue.' },
  { key: 'rooms_reply_email_enabled', label: 'Rooms reply emails', description: 'Email me when someone replies to my post.' },
  { key: 'product_updates', label: 'Product updates', description: 'Major new features and announcements.' },
];

const FOUNDER_BUILDER_CHANNELS: readonly NotificationChannel[] = [
  { key: 'daily_task_plan_email_enabled', label: 'Daily task-plan email', description: 'Email me my first task each morning when a plan is ready.' },
  { key: 'stage_guidance_emails', label: 'Stage guidance emails', description: 'Occasional guidance for your confirmed stage, at most once every 14 days.' },
];

const MENTOR_CHANNELS: readonly NotificationChannel[] = [
  { key: 'discovery_call_request_in_app_enabled', label: 'Discovery call requests', description: 'Notify me in the platform when a founder requests a call.' },
  { key: 'discovery_call_request_email_enabled', label: 'Discovery call request emails', description: 'Email me when a founder requests a call.' },
];

const MARKETPLACE_CHANNELS: readonly NotificationChannel[] = [
  { key: 'listing_enquiry_in_app_enabled', label: 'Listing enquiries', description: 'Notify me in the platform when someone asks about my services.' },
  { key: 'listing_enquiry_email_enabled', label: 'Listing enquiry emails', description: 'Email me when someone asks about my services.' },
];

const INVESTOR_CHANNELS: readonly NotificationChannel[] = [
  { key: 'investor_match_in_app_enabled', label: 'New matches', description: 'Notify me when a founder matching my focus joins.' },
  { key: 'investor_match_email_enabled', label: 'New match emails', description: 'Email me when a founder matching my focus joins.' },
];

/** Founders and builders get the shared list only: they receive none of the rest. */
const CATEGORY_CHANNELS: Record<UserType, readonly NotificationChannel[]> = {
  founder: [],
  builder: [],
  mentor: MENTOR_CHANNELS,
  marketplace: MARKETPLACE_CHANNELS,
  investor: INVESTOR_CHANNELS,
};

/** Founders keep the existing "new investor alerts" toggle; an investor does not need to be told investors joined. */
const INVESTOR_UPDATES: NotificationChannel = {
  key: 'investor_updates', label: 'New investor alerts', description: 'Get pinged when a new angel investor joins the network.',
};

export function notificationChannelsForType(userType: UserType): readonly NotificationChannel[] {
  const shared = userType === 'investor' ? SHARED_CHANNELS : [...SHARED_CHANNELS, INVESTOR_UPDATES];
  return [...shared, ...(userType === 'founder' || userType === 'builder' ? FOUNDER_BUILDER_CHANNELS : []), ...CATEGORY_CHANNELS[userType]];
}

/** Every column the card reads and writes, whatever the type. */
export function allNotificationChannelKeys(): string[] {
  const keys = new Set<string>([INVESTOR_UPDATES.key, 'retention_emails']);
  for (const channel of SHARED_CHANNELS) keys.add(channel.key);
  for (const channel of FOUNDER_BUILDER_CHANNELS) keys.add(channel.key);
  for (const list of Object.values(CATEGORY_CHANNELS)) for (const channel of list) keys.add(channel.key);
  return [...keys];
}

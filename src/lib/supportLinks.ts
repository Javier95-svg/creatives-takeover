// "How you can support me" on founder and builder profiles. The provider
// allowlist mirrors public.support_link_provider() in
// 20261020110000_profile_support.sql; keep the two in step.

export const SUPPORT_ASKS = ['feedback', 'testers', 'intros', 'try', 'share'] as const;
export type SupportAsk = (typeof SUPPORT_ASKS)[number];

/** Shown when a founder has not chosen their own asks. */
export const DEFAULT_SUPPORT_ASKS: SupportAsk[] = ['feedback', 'share'];

const PROVIDERS: Array<[RegExp, string]> = [
  [/^https:\/\/(www\.)?buymeacoffee\.com\/[^/?#]/i, 'Buy Me a Coffee'],
  [/^https:\/\/(www\.)?ko-fi\.com\/[^/?#]/i, 'Ko-fi'],
  [/^https:\/\/(www\.)?patreon\.com\/[^/?#]/i, 'Patreon'],
  [/^https:\/\/(buy|donate)\.stripe\.com\/[^/?#]/i, 'Stripe'],
  [/^https:\/\/(www\.)?paypal\.me\/[^/?#]/i, 'PayPal'],
  [/^https:\/\/(www\.)?github\.com\/sponsors\/[^/?#]/i, 'GitHub Sponsors'],
  [/^https:\/\/(www\.)?opencollective\.com\/[^/?#]/i, 'Open Collective'],
];

export const SUPPORT_PROVIDER_LIST = 'Buy Me a Coffee, Ko-fi, Patreon, Stripe payment links, PayPal.me, GitHub Sponsors or Open Collective';

/** The provider behind an allowed support link, or null when the link is not allowed. */
export function supportLinkProvider(url: string | null | undefined): string | null {
  const value = url ?? '';
  if (!value || /\s/.test(value) || value.length > 300) return null;
  return PROVIDERS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/**
 * Why a support link is or is not shown. Visitors only ever receive 'live' or
 * 'none'; the owner sees the real reason so the profile can explain it.
 */
export type SupportLinkStatus = 'live' | 'none' | 'stale' | 'no_project' | 'reported';

export interface ProfileSupport {
  configured: boolean;
  asks: SupportAsk[];
  note: string | null;
  introTarget: string | null;
  paysFor: string | null;
  lastUpdateAt: string | null;
  launchSlug: string | null;
  linkStatus: SupportLinkStatus;
  supportUrl: string | null;
  supportProvider: string | null;
}

const STATUSES: SupportLinkStatus[] = ['live', 'none', 'stale', 'no_project', 'reported'];
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export function normalizeProfileSupport(raw: unknown): ProfileSupport | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const asks = Array.isArray(record.asks)
    ? record.asks.filter((ask): ask is SupportAsk => (SUPPORT_ASKS as readonly unknown[]).includes(ask))
    : DEFAULT_SUPPORT_ASKS;
  const supportUrl = text(record.support_url);
  const provider = supportLinkProvider(supportUrl);
  const status = STATUSES.includes(record.link_status as SupportLinkStatus) ? record.link_status as SupportLinkStatus : 'none';
  return {
    configured: record.configured === true,
    asks: [...new Set(asks)],
    note: text(record.note),
    introTarget: text(record.intro_target),
    paysFor: text(record.pays_for),
    lastUpdateAt: text(record.last_update_at),
    launchSlug: text(record.launch_slug),
    // A link the client would not allow is never shown, whatever the server says.
    linkStatus: provider ? status : 'none',
    supportUrl: provider ? supportUrl : null,
    supportProvider: provider,
  };
}

/** Before its migration runs, the section still shows the default asks. */
export function defaultProfileSupport(): ProfileSupport {
  return {
    configured: false,
    asks: DEFAULT_SUPPORT_ASKS,
    note: null,
    introTarget: null,
    paysFor: null,
    lastUpdateAt: null,
    launchSlug: null,
    linkStatus: 'none',
    supportUrl: null,
    supportProvider: null,
  };
}

export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

export function lastUpdateLabel(iso: string | null, now: Date = new Date()): string {
  const days = daysSince(iso, now);
  if (days === null) return 'No updates yet';
  if (days === 0) return 'Last update today';
  if (days === 1) return 'Last update yesterday';
  return `Last update ${days} days ago`;
}

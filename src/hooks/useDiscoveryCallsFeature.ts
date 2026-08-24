import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getDiscoveryCallQuotaStatus } from '@/services/discoveryCallService';

/**
 * Whether Discovery Calls are switched on server-side.
 *
 * Returns `true`, `false`, or `undefined` when we genuinely do not know, and the
 * distinction matters. Callers must only degrade a booking CTA on an explicit
 * `false`.
 *
 * The reason there are three states: whether the feature is on lives in an edge
 * env var (`DISCOVERY_CALL_REQUESTS_V2_ENABLED`), while the per-mentor bookable
 * flag comes from `get_mentor_discovery_call_availability`, a database function
 * that cannot see it. So the mentor card and profile were rendering an enabled
 * "Request Discovery Call" button that landed on a page refusing the booking.
 * Four founders hit that dead end after the V2 rollout and one reloaded the same
 * booking page seven times.
 *
 * `undefined` covers a signed-out visitor (the quota endpoint needs a user) and
 * an edge function old enough not to send the field. Neither is evidence the
 * feature is off, and a signed-out founder clicking through to log in and then
 * book is a path worth keeping. Only a definite `false` should close the door.
 *
 * One shared query key so a list of mentor cards issues a single request.
 */
export function useDiscoveryCallsFeature(): boolean | undefined {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['discovery-calls-feature-enabled'],
    enabled: Boolean(user?.id),
    // The flag changes only on a redeploy, so this never needs to be fresh.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: async (): Promise<boolean | undefined> => {
      try {
        const status = await getDiscoveryCallQuotaStatus();
        return typeof status?.featureEnabled === 'boolean' ? status.featureEnabled : undefined;
      } catch {
        // An unreachable endpoint is not evidence the feature is off.
        return undefined;
      }
    },
  });

  return data;
}

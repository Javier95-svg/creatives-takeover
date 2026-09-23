import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

type Refresh = () => Promise<unknown>;
type RealtimeClient = Pick<SupabaseClient, 'channel' | 'removeChannel'>;

/** An event must read a new snapshot, not reuse an RPC started before the event. */
export async function refreshHeaderCounts(queryClient: Pick<QueryClient, 'cancelQueries' | 'invalidateQueries'>, userId: string | undefined) {
  if (!userId) return;
  const queryKey = ['workspace-header-counts', userId];
  // Keep the immediate local read decrement when aborting an older snapshot.
  await queryClient.cancelQueries({ queryKey, exact: true }, { revert: false });
  await queryClient.invalidateQueries({ queryKey, exact: true });
}

/** Collapse bursts, but never lose an event that arrives during an in-flight read. */
export function createHeaderRefreshQueue(refresh: Refresh, delay = 75) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  let stopped = false;
  const run = async () => {
    timer = undefined;
    if (stopped) return;
    pending = false;
    running = true;
    try { await refresh(); } catch { /* Poll/focus retries recover transient failures. */ }
    finally {
      running = false;
      if (pending && !stopped) timer = setTimeout(run, delay);
    }
  };
  return {
    request() {
      if (stopped) return;
      pending = true;
      if (!running && timer === undefined) timer = setTimeout(run, delay);
    },
    stop() {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}

type Entry = { listeners: Set<Refresh>; dispose: () => void };
const subscriptions = new WeakMap<object, Map<string, Entry>>();

/** One channel per client/account, shared across header consumers. RLS remains authoritative. */
export function subscribeWorkspaceHeader(client: RealtimeClient, userId: string, refresh: Refresh) {
  let accounts = subscriptions.get(client);
  if (!accounts) {
    accounts = new Map();
    subscriptions.set(client, accounts);
  }
  let entry = accounts.get(userId);
  if (!entry) {
    const listeners = new Set<Refresh>();
    const queue = createHeaderRefreshQueue(() => Promise.all([...listeners].map(listener => listener())));
    const channel = client.channel(`workspace-header-${userId}`)
      // Postgres Changes only delivers rows this account can SELECT under existing RLS.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=neq.${userId}` }, queue.request)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=neq.${userId}` }, queue.request)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` }, queue.request)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` }, queue.request)
      .subscribe(status => {
        // Reconcile after initial subscribe and every reconnect (events may have been missed).
        if (status === 'SUBSCRIBED') queue.request();
      });
    entry = { listeners, dispose: () => { queue.stop(); void client.removeChannel(channel); } };
    accounts.set(userId, entry);
  }
  entry.listeners.add(refresh);
  const currentEntry = entry;
  return () => {
    currentEntry.listeners.delete(refresh);
    if (currentEntry.listeners.size === 0) {
      currentEntry.dispose();
      accounts!.delete(userId);
    }
  };
}

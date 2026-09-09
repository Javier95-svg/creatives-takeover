import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isCompletionChainEnabled } from '@/lib/completionChain';
import { FOUNDER_TOOLS_BY_KEY, type FounderToolKey } from '@/config/founderToolCatalog';

export default function CompletionChainResume() {
  const { user } = useAuth();
  const enabled = isCompletionChainEnabled();
  const { data, isError, refetch } = useQuery({
    queryKey: ['completion-chain-resume', user?.id], enabled: enabled && Boolean(user), staleTime: 10_000,
    queryFn: async () => {
      const result = await (supabase as any).from('journey_handoffs')
        .select('id,destination_tool,payload,status').eq('user_id', user!.id)
        .in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20);
      if (result.error) throw result.error;
      return result.data as Array<{ id: string; destination_tool: FounderToolKey; payload: { destinationRoute?: string } }>;
    },
  });
  if (!enabled || !user) return null;
  if (isError) return <button onClick={() => void refetch()} className="text-sm underline">Retry loading your next step</button>;
  const candidates = (data ?? []).filter(row => {
    const route = row.payload?.destinationRoute;
    const tool = FOUNDER_TOOLS_BY_KEY[row.destination_tool];
    if (!route || !tool || !route.startsWith('/') || route.startsWith('//')) return false;
    try { return new URL(route, window.location.origin).pathname === tool.route; } catch { return false; }
  });
  if (!candidates.length) return null;
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-semibold">Continue your startup cycle</h2>
    <p className="text-sm text-muted-foreground">Your saved output is ready for the next tool. Choose the work you want to continue.</p>
    {candidates.map(row => <Link className="block font-medium text-primary underline" key={row.id} to={row.payload.destinationRoute!}>
      Continue to {FOUNDER_TOOLS_BY_KEY[row.destination_tool].name}
    </Link>)}
  </section>;
}

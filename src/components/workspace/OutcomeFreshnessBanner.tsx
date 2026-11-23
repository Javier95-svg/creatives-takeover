import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { freshnessMessage, parseProjectFreshness, type FreshnessTool } from '@/lib/outcomeFreshness';

/**
 * "Built on an earlier ICP." Shown on a tool when its current result for the
 * project was made before a newer result it depends on (a new ICP version, a
 * newer PMF verdict, a published MVP). The founder updates it in the tool, or
 * keeps it as is, which re-stamps it so the notice goes away.
 */
export function OutcomeFreshnessBanner({ tool, updateHref, updateLabel, className }: {
  tool: FreshnessTool;
  /** Where updating happens, when it is not on this page. */
  updateHref?: string;
  updateLabel?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const queryClient = useQueryClient();
  const [keeping, setKeeping] = useState(false);
  const [failed, setFailed] = useState(false);

  const freshness = useQuery({
    queryKey: ['project-outcome-freshness', activeProjectId],
    enabled: Boolean(user && activeProjectId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('project_outcome_freshness', { p_project_id: activeProjectId });
      if (error) throw error;
      return parseProjectFreshness(data);
    },
  });

  const entry = freshness.data?.[tool];
  const message = entry ? freshnessMessage(tool, entry.changed) : null;
  if (!entry || !message) return null;

  const keep = async () => {
    setKeeping(true);
    setFailed(false);
    const { error } = await (supabase as any).rpc('keep_outcome_sources', { p_tool: tool, p_id: entry.id });
    setKeeping(false);
    if (error) { setFailed(true); return; }
    await queryClient.invalidateQueries({ queryKey: ['project-outcome-freshness', activeProjectId] });
  };

  return (
    <div role="status" className={`flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <RefreshCw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update it so it builds on what you know now, or keep it as it is.
          </p>
          {failed ? <p role="alert" className="mt-1 text-sm text-destructive">That was not saved. Try again.</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {updateHref ? (
          <Button asChild size="sm">
            <Link to={updateHref}>{updateLabel ?? 'Update it'}</Link>
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={keeping} onClick={() => void keep()}>
          {keeping ? 'Saving…' : 'Keep as is'}
        </Button>
      </div>
    </div>
  );
}

export default OutcomeFreshnessBanner;

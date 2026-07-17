import { useMemo, useState } from 'react';
import { Download, ExternalLink, History, Loader2, MessageSquareText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscoveryLeads } from '@/hooks/useDiscoveryLeads';
import {
  discoveryLeadsCsv, fetchLeadActivities, leadDisplayHandle, LEAD_SOURCE_LABEL,
  type PMFDiscoveryLead, type PMFDiscoveryLeadActivityType, type PMFDiscoveryLeadSource,
} from '@/lib/pmfDiscoveryLeads';
import { captureEvent } from '@/lib/analytics';
import type { PMFDiscoveryLeadStatus } from '@/hooks/useCustomerDiscovery';

const STATUSES: PMFDiscoveryLeadStatus[] = ['new', 'saved', 'contacted', 'interview_scheduled', 'interviewed', 'dismissed'];
const EDITABLE_STATUSES: PMFDiscoveryLeadStatus[] = ['new', 'saved', 'contacted', 'interview_scheduled', 'dismissed'];
const SOURCES: PMFDiscoveryLeadSource[] = ['reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web'];

const ACTIVITY_LABEL: Record<PMFDiscoveryLeadActivityType, string> = {
  status_changed: 'Status changed',
  note_added: 'Note updated',
  outreach_copied: 'Outreach message copied',
  outreach_sent: 'Outreach sent',
  interview_scheduled: 'Interview scheduled',
  interview_logged: 'Interview logged',
};

interface LeadActivity {
  id: string;
  activity_type: PMFDiscoveryLeadActivityType;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface PMFInterviewLeadSeed {
  sourceLeadId: string;
  username: string;
  subreddit: string;
  permalink: string;
  source?: string;
}

export default function PMFDiscoveryPipeline({ onLogInterview }: { onLogInterview?: (seed: PMFInterviewLeadSeed) => void }) {
  const { user } = useAuth();
  const { leads, loading, error, setStatus, saveNotes } = useDiscoveryLeads(true);
  const [statusFilter, setStatusFilter] = useState<'active' | PMFDiscoveryLeadStatus>('active');
  const [sourceFilter, setSourceFilter] = useState<'all' | PMFDiscoveryLeadSource>('all');
  const [subreddit, setSubreddit] = useState('');
  const [minimumScore, setMinimumScore] = useState(0);
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, LeadActivity[]>>({});
  const [timelineLoading, setTimelineLoading] = useState<string | null>(null);

  const visible = useMemo(() => leads.filter((lead) => {
    if (statusFilter === 'active' ? lead.status === 'dismissed' : lead.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
    if (subreddit && !(lead.latest_subreddit || '').toLowerCase().includes(subreddit.toLowerCase())) return false;
    if (lead.rank_score < minimumScore) return false;
    if (repeatOnly && lead.occurrence_count < 2) return false;
    return true;
  }), [leads, minimumScore, repeatOnly, sourceFilter, statusFilter, subreddit]);

  const run = async (key: string, action: () => Promise<void>) => {
    setPending(key);
    try { await action(); }
    catch (err) { console.error(err); toast.error('Could not update this lead.'); }
    finally { setPending(null); }
  };

  const toggleTimeline = async (lead: PMFDiscoveryLead) => {
    if (openTimeline === lead.id) { setOpenTimeline(null); return; }
    setOpenTimeline(lead.id);
    if (!user || timelines[lead.id]) return;
    setTimelineLoading(lead.id);
    try {
      const activities = await fetchLeadActivities(user.id, lead.id);
      setTimelines((current) => ({ ...current, [lead.id]: activities as LeadActivity[] }));
    } catch (err) {
      console.warn('Failed to load lead activity:', err);
    } finally {
      setTimelineLoading(null);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([discoveryLeadsCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pmf-discovery-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    captureEvent('pmf_discovery_leads_exported', { lead_count: visible.length });
  };

  const communityLabel = (lead: PMFDiscoveryLead) =>
    lead.source === 'reddit' && lead.latest_subreddit ? `r/${lead.latest_subreddit}` : LEAD_SOURCE_LABEL[lead.source];

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Discovery pipeline</h3>
          <p className="text-xs text-muted-foreground">Track leads from every source — platform members, Reddit, Hacker News, and the web — from first sighting through a completed interview.</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!visible.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Lead status">
          <option value="active">Active leads</option>
          {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} aria-label="Lead source">
          <option value="all">All sources</option>
          {SOURCES.map((source) => <option key={source} value={source}>{LEAD_SOURCE_LABEL[source]}</option>)}
        </select>
        <Input value={subreddit} onChange={(event) => setSubreddit(event.target.value)} placeholder="Filter subreddit" />
        <Input type="number" min={0} max={100} value={minimumScore || ''} onChange={(event) => setMinimumScore(Math.max(0, Math.min(100, Number(event.target.value || 0))))} placeholder="Minimum score" />
        <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={repeatOnly} onChange={(event) => setRepeatOnly(event.target.checked)} /> Repeated only</label>
      </div>

      {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
      {error && <p className="text-sm text-warning">{error}</p>}
      {!loading && !error && visible.length === 0 && <p className="text-sm text-muted-foreground">No leads match these filters.</p>}

      <div className="space-y-3">
        {visible.map((lead) => (
          <div key={lead.id} className="space-y-3 rounded-xl border border-border/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{leadDisplayHandle(lead)}</p>
                <p className="text-xs text-muted-foreground">{communityLabel(lead)} · seen {lead.occurrence_count}×</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{LEAD_SOURCE_LABEL[lead.source]}</Badge>
                <Badge variant="outline">Score {lead.rank_score}</Badge>
                <Badge variant="outline">{lead.status.replaceAll('_', ' ')}</Badge>
              </div>
            </div>
            {lead.latest_pain_quote && <p className="line-clamp-2 text-xs italic text-muted-foreground">“{lead.latest_pain_quote}”</p>}
            <div className="flex flex-wrap gap-2">
              {(lead.latest_permalink || lead.profile_url) && (
                <a href={lead.latest_permalink || lead.profile_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Source</a>
              )}
              <select className="h-7 rounded border bg-background px-2 text-xs" value={lead.status} disabled={pending === lead.id} onChange={(event) => void run(lead.id, () => setStatus(lead.id, event.target.value as PMFDiscoveryLeadStatus))} aria-label={`Status for ${lead.username}`}>
                {lead.status === 'interviewed' && <option value="interviewed">interviewed</option>}
                {EDITABLE_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>
              {onLogInterview && lead.status !== 'dismissed' && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                  void run(lead.id, async () => {
                    await setStatus(lead.id, 'interview_scheduled');
                    onLogInterview({
                      sourceLeadId: lead.id,
                      username: leadDisplayHandle(lead).replace(/^u\//, ''),
                      subreddit: lead.latest_subreddit || '',
                      permalink: lead.latest_permalink || lead.profile_url || '',
                      source: lead.source,
                    });
                  });
                }}><MessageSquareText className="mr-1 h-3 w-3" /> Log interview</Button>
              )}
              <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void toggleTimeline(lead)}>
                <History className="h-3 w-3" /> {openTimeline === lead.id ? 'Hide history' : 'History'}
              </button>
            </div>
            {openTimeline === lead.id && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                {timelineLoading === lead.id && <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />}
                {timelineLoading !== lead.id && (timelines[lead.id]?.length ? (
                  <ul className="space-y-1.5">
                    {timelines[lead.id].map((activity) => (
                      <li key={activity.id} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-foreground">
                          {ACTIVITY_LABEL[activity.activity_type] || activity.activity_type}
                          {activity.activity_type === 'status_changed' && typeof activity.metadata?.status === 'string'
                            ? ` → ${String(activity.metadata.status).replaceAll('_', ' ')}`
                            : ''}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{new Date(activity.occurred_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={noteDrafts[lead.id] ?? lead.notes} onChange={(event) => setNoteDrafts((current) => ({ ...current, [lead.id]: event.target.value }))} placeholder="Private founder note" maxLength={4000} />
              <Button size="icon" variant="outline" aria-label={`Save note for ${lead.username}`} disabled={pending === lead.id} onClick={() => void run(lead.id, async () => { await saveNotes(lead.id, noteDrafts[lead.id] ?? lead.notes); toast.success('Lead note saved.'); })}><Save className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing, Check, Copy, Download, ExternalLink, History, Loader2, MessageSquareText, MoreHorizontal, NotebookPen, Send, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscoveryLeads } from '@/hooks/useDiscoveryLeads';
import { useMessaging } from '@/hooks/useMessaging';
import type { PMFValidationStage } from '@/hooks/useCustomerDiscovery';
import { captureEvent } from '@/lib/analytics';
import {
  CONVERSATION_TABS, conversationProgress, DEFAULT_FOLLOW_UP_DAYS, FOLLOW_UP_OPTIONS, followUpDate, followUpLabel,
  followUpState, groupConversations, nextAction, STATUS_LABEL, tabFor, type ConversationTab,
} from '@/lib/pmfConversations';
import { followUpMessage, outreachMessage } from '@/lib/pmfDiscoveryOutreach';
import {
  discoveryLeadsCsv, fetchLeadActivities, leadDisplayHandle, LEAD_SOURCE_LABEL, logDiscoveryLeadActivity,
  type PMFDiscoveryLead, type PMFDiscoveryLeadActivityType, type PMFDiscoveryLeadSource,
} from '@/lib/pmfDiscoveryLeads';
import { cn } from '@/lib/utils';

const ACTIVITY_LABEL: Record<PMFDiscoveryLeadActivityType, string> = {
  status_changed: 'Moved',
  note_added: 'Note updated',
  outreach_copied: 'Message copied',
  outreach_sent: 'Marked as contacted',
  interview_scheduled: 'Interview booked',
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

/** Filters only help once the list is long; below this they are noise. */
const FILTER_THRESHOLD = 10;

const communityLabel = (lead: PMFDiscoveryLead) =>
  lead.source === 'reddit' && lead.latest_subreddit ? `r/${lead.latest_subreddit}` : LEAD_SOURCE_LABEL[lead.source];

/**
 * "Your conversations": everyone found in Customer Discovery, worked through
 * one step at a time. Each person shows one primary action for where they
 * are; everything else sits in the "⋯" menu.
 */
export default function PMFDiscoveryPipeline({
  api, onLogInterview, onOpenEvidence, interviewsLogged = 0, focusLeadId = null, stage = 'problem_discovery',
  messageTemplate, demoUrl, latestDiscoveryId = null, showToContactSignal = 0,
}: {
  /** The list and its actions, owned by the page so the layout can follow it. */
  api: ReturnType<typeof useDiscoveryLeads>;
  onLogInterview?: (seed: PMFInterviewLeadSeed) => void;
  onOpenEvidence?: () => void;
  interviewsLogged?: number;
  focusLeadId?: string | null;
  stage?: PMFValidationStage;
  messageTemplate?: string | null;
  demoUrl?: string | null;
  /** People from this search are marked "From your latest search". */
  latestDiscoveryId?: string | null;
  /** Bumped after a search so the list opens on To contact. */
  showToContactSignal?: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation } = useMessaging({ autoLoad: false });
  const { leads, loading, error, setStatus, markContacted, setFollowUp, saveNotes } = api;
  const [tab, setTab] = useState<ConversationTab>('to_contact');
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    if (showToContactSignal) { setTab('to_contact'); setShowDismissed(false); }
  }, [showToContactSignal]);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | PMFDiscoveryLeadSource>('all');
  const [composing, setComposing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [followUpDays, setFollowUpDays] = useState<Record<string, number>>({});
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [timelineOpen, setTimelineOpen] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, LeadActivity[]>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focused = useRef(false);

  const filtered = useMemo(() => leads.filter((lead) => {
    if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
    const text = `${leadDisplayHandle(lead)} ${lead.latest_pain_quote ?? ''} ${lead.latest_subreddit ?? ''}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [leads, query, sourceFilter]);
  const { groups, dismissed } = useMemo(() => groupConversations(filtered), [filtered]);
  const progress = useMemo(() => conversationProgress(leads, interviewsLogged), [interviewsLogged, leads]);
  const visible = showDismissed ? dismissed : groups[tab];

  // A reminder link (?lead=) opens the person's tab and brings them into view.
  useEffect(() => {
    if (focused.current || !focusLeadId || !leads.length) return;
    const lead = leads.find((item) => item.id === focusLeadId);
    if (!lead) return;
    focused.current = true;
    const leadTab = tabFor(lead.status);
    if (leadTab) { setTab(leadTab); setShowDismissed(false); } else setShowDismissed(true);
    setHighlighted(lead.id);
    window.setTimeout(() => cardRefs.current[lead.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    window.setTimeout(() => setHighlighted(null), 4000);
  }, [focusLeadId, leads]);

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    setPending(key);
    try {
      await action();
      if (success) toast.success(success);
    } catch (err) {
      console.error(err);
      toast.error('Could not update this person. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const draftFor = (lead: PMFDiscoveryLead) => drafts[lead.id] ?? outreachMessage({
    stage, name: leadDisplayHandle(lead), community: communityLabel(lead), template: messageTemplate, demoUrl,
  });

  const copyText = async (lead: PMFDiscoveryLead, text: string, activity?: PMFDiscoveryLeadActivityType) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied. Paste it where you found them.');
      if (user && activity) void logDiscoveryLeadActivity(user.id, lead.id, activity).catch(() => undefined);
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  };

  const openChat = async (lead: PMFDiscoveryLead) => {
    if (!lead.platform_user_id) return;
    const conversationId = await startConversation(lead.platform_user_id);
    if (conversationId) navigate(`/messages?conversationId=${conversationId}`);
  };

  const sent = (lead: PMFDiscoveryLead) => {
    const days = followUpDays[lead.id] ?? DEFAULT_FOLLOW_UP_DAYS;
    const when = days > 0 ? followUpDate(days) : null;
    void run(lead.id, async () => {
      await markContacted(lead.id, when);
      setComposing(null);
      captureEvent('pmf_discovery_marked_contacted', { follow_up_days: days });
    }, when ? `Moved to Contacted. We'll remind you ${FOLLOW_UP_OPTIONS.find((option) => option.days === days)?.label ?? 'later'}.` : 'Moved to Contacted.');
  };

  const primary = (lead: PMFDiscoveryLead) => {
    const { action, label } = nextAction(lead.status);
    if (action === 'write_message') {
      return <Button size="sm" onClick={() => setComposing(composing === lead.id ? null : lead.id)} aria-expanded={composing === lead.id}>
        <MessageSquareText className="mr-1.5 h-4 w-4" aria-hidden="true" />{label}
      </Button>;
    }
    if (action === 'book_interview') {
      return <Button size="sm" className="h-auto min-h-9 whitespace-normal py-1.5 text-left" disabled={pending === lead.id} onClick={() => void run(lead.id, () => setStatus(lead.id, 'interview_scheduled'), 'Interview booked. Log it once you have talked.')}>
        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />{label}
      </Button>;
    }
    if (action === 'log_interview') {
      return onLogInterview ? <Button size="sm" onClick={() => onLogInterview({
        sourceLeadId: lead.id,
        username: leadDisplayHandle(lead).replace(/^u\//, ''),
        subreddit: lead.latest_subreddit || '',
        permalink: lead.latest_permalink || lead.profile_url || '',
        source: lead.source,
      })}>
        <NotebookPen className="mr-1.5 h-4 w-4" aria-hidden="true" />{label}
      </Button> : null;
    }
    if (action === 'see_evidence') {
      return onOpenEvidence ? <Button size="sm" variant="outline" onClick={onOpenEvidence}>{label}</Button> : null;
    }
    return <Button size="sm" variant="outline" disabled={pending === lead.id} onClick={() => void run(lead.id, () => setStatus(lead.id, 'new'))}>{label}</Button>;
  };

  const exportCsv = () => {
    const blob = new Blob([discoveryLeadsCsv(leads)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `customer-discovery-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    captureEvent('pmf_discovery_leads_exported', { lead_count: leads.length });
  };

  const toggleTimeline = async (lead: PMFDiscoveryLead) => {
    if (timelineOpen === lead.id) { setTimelineOpen(null); return; }
    setTimelineOpen(lead.id);
    if (!user || timelines[lead.id]) return;
    try {
      const activities = await fetchLeadActivities(user.id, lead.id);
      setTimelines((current) => ({ ...current, [lead.id]: activities as LeadActivity[] }));
    } catch (err) {
      console.warn('Failed to load lead activity:', err);
    }
  };

  return (
    <section aria-labelledby="conversations-title" className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="conversations-title" className="font-semibold">Your conversations</h3>
          <p className="text-xs text-muted-foreground">Everyone you find lands here. Work through them one step at a time.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="More options for your conversations"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!leads.length} onSelect={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Where the founder stands against the five conversations a first read needs. */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">Conversations: {progress.interviews} of {progress.target}</span>
          <span className="text-xs text-muted-foreground">
            {[
              progress.toContact ? `${progress.toContact} to contact` : null,
              progress.followUpsDue ? `${progress.followUpsDue} follow-up${progress.followUpsDue === 1 ? '' : 's'} due` : null,
            ].filter(Boolean).join(' · ') || (progress.interviews >= progress.target ? 'Enough for a first read' : 'Find people to talk to above')}
          </span>
        </div>
        <Progress value={progress.percent} className="mt-2 h-1.5" aria-label={`${progress.interviews} of ${progress.target} conversations logged`} />
      </div>

      {!showDismissed && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as ConversationTab)}>
          {/* One scrolling row on phones rather than three wrapped rows. */}
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto">
            {CONVERSATION_TABS.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="shrink-0 gap-1.5">
                {item.label}
                <span className="rounded-full bg-muted px-1.5 text-caption tabular-nums text-muted-foreground">{groups[item.key].length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {showDismissed && (
        <p className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">Not a fit ({dismissed.length})</span>
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowDismissed(false)}>Back to your conversations</button>
        </p>
      )}

      {leads.length >= FILTER_THRESHOLD && (
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or what they said" aria-label="Search your conversations" />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} aria-label="Where they were found">
            <option value="all">All sources</option>
            {(Object.keys(LEAD_SOURCE_LABEL) as PMFDiscoveryLeadSource[]).map((source) => <option key={source} value={source}>{LEAD_SOURCE_LABEL[source]}</option>)}
          </select>
        </div>
      )}

      {loading && !leads.length && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" aria-label="Loading your conversations" />}
      {error && <p className="text-sm text-warning">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {showDismissed ? 'No one marked as not a fit.' : CONVERSATION_TABS.find((item) => item.key === tab)?.empty}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((lead) => {
          const due = followUpState(lead);
          const scanned = lead.source !== 'platform';
          const reminder = lead.follow_up_at && lead.status === 'contacted' ? (
            <Badge variant="outline" className={cn('w-fit gap-1 text-caption', due === 'overdue' ? 'border-destructive/40 text-destructive' : due === 'today' ? 'border-warning/40 text-warning' : 'text-muted-foreground')}>
              <BellRing className="h-3 w-3" aria-hidden="true" />{followUpLabel(lead.follow_up_at)}
            </Badge>
          ) : null;
          return (
            <div key={lead.id} ref={(node) => { cardRefs.current[lead.id] = node; }}
              className={cn('space-y-3 rounded-xl border border-border/60 p-4 transition-shadow', highlighted === lead.id && 'ring-2 ring-primary')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{leadDisplayHandle(lead)}</p>
                  <p className="text-xs text-muted-foreground">
                    {communityLabel(lead)}
                    {scanned && lead.occurrence_count > 1 ? ` · seen ${lead.occurrence_count} times` : ''}
                    {showDismissed ? ` · ${STATUS_LABEL[lead.status]}` : ''}
                  </p>
                  {latestDiscoveryId && lead.latest_discovery_id === latestDiscoveryId && tabFor(lead.status) === 'to_contact' && (
                    <Badge variant="outline" className="mt-1.5 w-fit border-primary/30 bg-primary/5 text-caption text-primary">From your latest search</Badge>
                  )}
                  {/* Under the name on phones, so the name keeps its room. */}
                  {reminder && <div className="mt-1.5 sm:hidden">{reminder}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {reminder && <div className="hidden sm:block">{reminder}</div>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`More options for ${leadDisplayHandle(lead)}`}><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(lead.latest_permalink || lead.profile_url) && (
                        <DropdownMenuItem asChild>
                          <a href={lead.latest_permalink || lead.profile_url || '#'} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open where you found them</a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setNoteOpen(noteOpen === lead.id ? null : lead.id)}><NotebookPen className="mr-2 h-4 w-4" />{lead.notes ? 'Edit note' : 'Add a note'}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void toggleTimeline(lead)}><History className="mr-2 h-4 w-4" />History</DropdownMenuItem>
                      {lead.status === 'contacted' && (
                        <DropdownMenuItem onSelect={() => void run(lead.id, () => setFollowUp(lead.id, lead.follow_up_at ? null : followUpDate(DEFAULT_FOLLOW_UP_DAYS)), lead.follow_up_at ? 'Reminder removed.' : 'We will remind you in 3 days.')}>
                          <BellRing className="mr-2 h-4 w-4" />{lead.follow_up_at ? 'Remove the reminder' : 'Remind me in 3 days'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {lead.status !== 'new' && lead.status !== 'saved' && lead.status !== 'dismissed' && (
                        <DropdownMenuItem onSelect={() => void run(lead.id, () => setStatus(lead.id, 'new'))}>Move back to To contact</DropdownMenuItem>
                      )}
                      {lead.status !== 'dismissed' && (
                        <DropdownMenuItem onSelect={() => void run(lead.id, () => setStatus(lead.id, 'dismissed'), 'Moved to Not a fit.')}>Not a fit</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {lead.latest_pain_quote && <p className="line-clamp-2 text-xs italic text-muted-foreground">“{lead.latest_pain_quote}”</p>}

              <div className="flex flex-wrap items-center gap-2">
                {primary(lead)}
                {lead.status === 'contacted' && (
                  <Button size="sm" variant="outline" disabled={pending === lead.id}
                    onClick={() => void run(lead.id, () => setStatus(lead.id, 'dismissed', 'said_no'), 'Moved to Not a fit. A no still tells you something.')}>
                    <X className="mr-1.5 h-4 w-4" aria-hidden="true" />They said no
                  </Button>
                )}
                {lead.status === 'contacted' && (
                  <Button size="sm" variant="ghost" onClick={() => void copyText(lead, followUpMessage(leadDisplayHandle(lead)), 'outreach_copied')}>
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />Copy a follow-up
                  </Button>
                )}
              </div>

              {composing === lead.id && (
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  {(lead.latest_permalink || (lead.source !== 'platform' && lead.profile_url)) && (
                    <a href={lead.latest_permalink || lead.profile_url || '#'} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Read their post first <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                  <label htmlFor={`message-${lead.id}`} className="block text-xs font-medium">Your message (edit it to sound like you)</label>
                  <Textarea id={`message-${lead.id}`} rows={4} value={draftFor(lead)}
                    onChange={(event) => setDrafts((current) => ({ ...current, [lead.id]: event.target.value }))} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => void copyText(lead, draftFor(lead), 'outreach_copied')}>
                      <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />Copy message
                    </Button>
                    {lead.source === 'platform' && lead.platform_user_id && (
                      <Button size="sm" variant="outline" onClick={() => void openChat(lead)}>
                        <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />Open the chat
                      </Button>
                    )}
                    <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                    <Button size="sm" disabled={pending === lead.id} onClick={() => sent(lead)}>
                      {pending === lead.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                      I sent it
                    </Button>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      and remind me
                      <select className="h-8 rounded-md border bg-background px-2 text-xs text-foreground" aria-label="When to remind you to follow up"
                        value={followUpDays[lead.id] ?? DEFAULT_FOLLOW_UP_DAYS}
                        onChange={(event) => setFollowUpDays((current) => ({ ...current, [lead.id]: Number(event.target.value) }))}>
                        {FOLLOW_UP_OPTIONS.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
                        <option value={0}>no reminder</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {noteOpen === lead.id && (
                <div className="flex gap-2">
                  <Input value={noteDrafts[lead.id] ?? lead.notes} onChange={(event) => setNoteDrafts((current) => ({ ...current, [lead.id]: event.target.value }))}
                    placeholder="A private note, only you see it" maxLength={4000} aria-label={`Note about ${leadDisplayHandle(lead)}`} />
                  <Button size="sm" variant="outline" disabled={pending === lead.id}
                    onClick={() => void run(lead.id, async () => { await saveNotes(lead.id, noteDrafts[lead.id] ?? lead.notes); setNoteOpen(null); }, 'Note saved.')}>Save</Button>
                </div>
              )}
              {noteOpen !== lead.id && lead.notes && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Note: </span>{lead.notes}</p>}

              {timelineOpen === lead.id && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  {timelines[lead.id]?.length ? (
                    <ul className="space-y-1.5">
                      {timelines[lead.id].map((activity) => (
                        <li key={activity.id} className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="text-foreground">
                            {ACTIVITY_LABEL[activity.activity_type] || activity.activity_type}
                            {activity.activity_type === 'status_changed' && typeof activity.metadata?.status === 'string'
                              ? ` to ${STATUS_LABEL[activity.metadata.status as keyof typeof STATUS_LABEL] ?? activity.metadata.status}`
                              : ''}
                          </span>
                          <span className="shrink-0 text-muted-foreground">{new Date(activity.occurred_at).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-muted-foreground">No history yet.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showDismissed && dismissed.length > 0 && (
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setShowDismissed(true)}>
          Not a fit ({dismissed.length})
        </button>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Pencil, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useCreditQuote } from '@/hooks/useCreditQuote';
import { useGtmResearch, type GtmResearch, type ProspectRow } from '@/hooks/useGtmResearch';
import { RESEARCH_RUN_CREDITS, sanitizeSegment, type BusinessProfile, type Segment, type SourcedClaim } from '@/lib/gtmResearch';
import type { GTMPipelineEntry, GTMPlanV2 } from '@/lib/gtmV2';
import { cn } from '@/lib/utils';
import { ProspectSheet } from './ProspectSheet';
import { ProspectsTable } from './ProspectsTable';
import { ResearchTimeline } from './ResearchTimeline';

interface FindCustomersProps {
  projectId: string | null;
  plan: GTMPlanV2 | null;
  onUpdatePlan?: (plan: GTMPlanV2) => Promise<void>;
  defaultWebsite?: string;
  /** For previews: render from a given research state instead of the database. */
  research?: GtmResearch;
}

type ResearchFailure = { message?: string; creditError?: boolean; errorCode?: string };

// ---- 1. Start ---------------------------------------------------------------------------

function ResearchStart({ defaultWebsite, busy, onAnalyze }: { defaultWebsite?: string; busy: boolean; onAnalyze: (input: { websiteUrl?: string; description?: string }) => void }) {
  const [website, setWebsite] = useState(defaultWebsite ?? '');
  const [describe, setDescribe] = useState(!defaultWebsite);
  const [description, setDescription] = useState('');
  useEffect(() => { if (defaultWebsite && !website) setWebsite(defaultWebsite); }, [defaultWebsite]); // eslint-disable-line react-hooks/exhaustive-deps -- prefill once
  const ready = website.trim().length > 3 || description.trim().length >= 20;
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8">
      <Badge className="bg-primary/10 text-primary">Find customers</Badge>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">Find companies to contact, with the reasons they fit</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        We read your website, agree with you who to target, then research real companies and check each one against your criteria on its own site. You get a list with evidence and a draft email for each. You send them yourself.
      </p>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (ready) onAnalyze({ websiteUrl: website.trim() || undefined, description: description.trim() || undefined }); }}>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Your website</span>
          <Input className="mt-1.5 max-w-xl" inputMode="url" placeholder="yourstartup.com" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        {describe ? (
          <label className="block">
            <span className="text-sm font-medium text-foreground">{website.trim() ? 'Anything to add (optional)' : 'Or describe your product'}</span>
            <Textarea className="mt-1.5 max-w-xl" rows={3} maxLength={2000} placeholder="What you sell, who it's for, and where they are." value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        ) : (
          <button type="button" className="text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => setDescribe(true)}>No website yet? Describe your product</button>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!ready || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="mr-2 h-4 w-4" aria-hidden="true" />}Read my business</Button>
          <span className="text-xs text-muted-foreground">Free. We read up to 5 public pages. Nothing is sent to anyone.</span>
        </div>
      </form>
    </section>
  );
}

// ---- 2 and 3. What we understood, who to target ---------------------------------------------

function ClaimCard({ label, claim, onSave }: { label: string; claim: SourcedClaim | null; onSave?: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(claim?.text ?? '');
  if (!claim) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        {onSave && !editing ? <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" aria-hidden="true" />Fix this</button> : null}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} maxLength={400} aria-label={`Edit ${label}`} />
          <div className="flex gap-2"><Button type="button" size="sm" onClick={() => { onSave?.(text.trim()); setEditing(false); }} disabled={text.trim().length < 3}>Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setText(claim.text); setEditing(false); }}>Cancel</Button></div>
        </div>
      ) : <p className="mt-1.5 text-sm text-foreground">{claim.text}</p>}
      {claim.sourceUrl ? <a href={claim.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline">From {claim.sourceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
        : <span className="mt-2 block text-xs text-muted-foreground">From your saved work or description</span>}
    </div>
  );
}

function SegmentEditor({ segment, onChange }: { segment: Segment; onChange: (segment: Segment) => void }) {
  const [adding, setAdding] = useState('');
  const update = (patch: Partial<Segment>) => onChange({ ...segment, ...patch });
  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      <div>
        <span className="text-sm font-medium text-foreground">What a company must show on its website</span>
        <ul className="mt-2 space-y-2">
          {segment.criteria.map((criterion) => (
            <li key={criterion.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm text-foreground">{criterion.label}</span>
              <button type="button" className={cn('rounded-full border px-2 py-0.5 text-xs', criterion.mustHave ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
                onClick={() => update({ criteria: segment.criteria.map((item) => (item.id === criterion.id ? { ...item, mustHave: !item.mustHave } : item)) })}>
                {criterion.mustHave ? 'Must have' : 'Nice to have'}
              </button>
              <button type="button" aria-label={`Remove ${criterion.label}`} className="text-muted-foreground hover:text-foreground" onClick={() => update({ criteria: segment.criteria.filter((item) => item.id !== criterion.id) })}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        {segment.criteria.length < 6 ? (
          <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (adding.trim().length < 3) return; update({ criteria: [...segment.criteria, { id: `c${Date.now()}`, label: adding.trim().slice(0, 160), mustHave: true }] }); setAdding(''); }}>
            <Input value={adding} onChange={(event) => setAdding(event.target.value)} placeholder="Add a criterion, e.g. Offers online booking" aria-label="Add a criterion" />
            <Button type="submit" variant="outline" size="sm" disabled={adding.trim().length < 3}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Add</span></Button>
          </form>
        ) : null}
      </div>
      <label className="block max-w-sm">
        <span className="text-sm font-medium text-foreground">Where</span>
        <Input className="mt-1.5" value={segment.geography} onChange={(event) => update({ geography: event.target.value.slice(0, 120) })} placeholder="e.g. United Kingdom" />
      </label>
    </div>
  );
}

function ResearchReview({ research, onError }: { research: GtmResearch; onError: (failure: ResearchFailure) => void }) {
  const run = research.run!;
  const profile = run.business_profile;
  const [selectedId, setSelectedId] = useState(run.segments[0]?.id ?? '');
  const [edited, setEdited] = useState<Record<string, Segment>>({});
  const quote = useCreditQuote('GTM_RESEARCH_RUN', { source: 'gtm_find_customers' });
  const segment = edited[selectedId] ?? run.segments.find((item) => item.id === selectedId) ?? null;
  const valid = segment ? sanitizeSegment(segment) : null;
  const free = Boolean(quote.data?.giftEligible || quote.data?.giftApplied);
  const saveClaim = (field: 'offering' | 'audience' | 'valueProposition') => (text: string) => void research.edit({ profile: { [field]: text } }).catch((error) => onError(error));

  return (
    <div className="space-y-6">
      {profile ? (
        <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">What we understood about {profile.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fix anything that's off. Research uses this to judge every company.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ClaimCard label="What you sell" claim={profile.offering} onSave={saveClaim('offering')} />
            <ClaimCard label="Who it's for" claim={profile.audience} onSave={saveClaim('audience')} />
            <ClaimCard label="Why they buy" claim={profile.valueProposition} onSave={saveClaim('valueProposition')} />
          </div>
          {profile.contextNotes.length ? (
            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">From your saved work: </span>{profile.contextNotes.join(' ')}
            </div>
          ) : null}
          {run.competitors.length ? (
            <div className="mt-4">
              <span className="text-sm font-medium text-foreground">Competitors we found (kept out of your list)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {run.competitors.map((competitor) => (
                  <span key={competitor.domain} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-sm" title={competitor.why}>
                    {competitor.domain}
                    <button type="button" aria-label={`Not a competitor: ${competitor.domain}`} className="text-muted-foreground hover:text-foreground" onClick={() => void research.edit({ removeCompetitors: [competitor.domain] }).catch(onError)}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Who should we look for?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick one group. Every company we find is checked against its must-haves.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Groups to target">
          {run.segments.map((item) => {
            const current = edited[item.id] ?? item;
            const active = item.id === selectedId;
            return (
              <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => setSelectedId(item.id)}
                className={cn('rounded-xl border p-4 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40')}>
                <span className="block font-semibold text-foreground">{current.name}</span>
                {current.pain ? <span className="mt-1 block text-sm text-muted-foreground">{current.pain}</span> : null}
                <span className="mt-3 block text-xs text-muted-foreground">{current.criteria.filter((criterion) => criterion.mustHave).length} must-haves{current.geography ? ` · ${current.geography}` : ''}</span>
                {current.roles.length ? <span className="mt-1 block text-xs text-muted-foreground">Contact: {current.roles.join(', ')}</span> : null}
              </button>
            );
          })}
        </div>
        {segment ? <SegmentEditor segment={segment} onChange={(next) => setEdited((previous) => ({ ...previous, [next.id]: next }))} /> : null}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold text-foreground">{free ? 'Your first research run is free' : `Research run · ${RESEARCH_RUN_CREDITS} credits`}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Up to 20 matching companies with evidence and a draft email for each.
            {free ? '' : ` Credits are held while it runs; you're charged in full only from 10 matches, less below that, nothing if none match.`}
            {!free && quote.data ? ` You have ${quote.data.available} credits.` : ''}
          </p>
        </div>
        <Button type="button" size="lg" disabled={!valid || research.busy} onClick={() => {
          if (!valid) return;
          void research.start(valid).catch(onError);
        }}>
          {research.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}Start research
        </Button>
      </section>
    </div>
  );
}

// ---- 5. Results summary -------------------------------------------------------------------

function ResultsHeader({ research, onNewSearch }: { research: GtmResearch; onNewSearch: () => void }) {
  const run = research.run!;
  const qualified = run.counts.qualified ?? 0;
  const charged = run.credits_charged ?? 0;
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {run.status === 'failed' ? 'No company matched every must-have' : `${qualified} ${qualified === 1 ? 'company matches' : 'companies match'} ${run.selected_segment?.name ?? 'your criteria'}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.error_detail ?? `Checked ${run.counts.checked ?? 0} websites. ${run.gifted ? 'This run was free.' : `Charged ${charged} of ${RESEARCH_RUN_CREDITS} credits.`}`}
            {run.status === 'partial' ? ' Fewer than expected: try a wider location or fewer must-haves.' : ''}
            {run.status === 'cancelled' ? ' Stopped early; you kept what was found.' : ''}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onNewSearch}>New search</Button>
      </div>
    </section>
  );
}

// ---- Container ------------------------------------------------------------------------------

export default function FindCustomers({ projectId, plan, onUpdatePlan, defaultWebsite, research: given }: FindCustomersProps) {
  const live = useGtmResearch(given ? null : projectId);
  const research = given ?? live;
  const { handleCreditError } = useCreditActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const run = research.run;
  const open = useMemo(() => research.prospects.find((prospect) => prospect.id === openId) ?? null, [research.prospects, openId]);

  const onError = (failure: ResearchFailure) => {
    if (failure?.creditError && handleCreditError(null, { creditError: true, errorCode: failure.errorCode, error: failure.message }, 'GTM_RESEARCH_RUN')) return;
    toast.error(failure?.message ?? 'Something went wrong. Nothing was charged.');
  };

  const primaryPlay = plan?.plays.find((play) => play.status === 'active') ?? plan?.plays[0] ?? null;
  const addToPipeline = async (prospect: ProspectRow) => {
    if (!plan || !onUpdatePlan || !primaryPlay) return;
    const entry: GTMPipelineEntry = {
      id: `research-${prospect.id}`, playId: primaryPlay.id, name: `${prospect.name} (${prospect.domain})`, stage: 'lead', value: 0,
      sourceChannelId: primaryPlay.channelId, momentum: 'active', occurredAt: new Date().toISOString(),
      notes: `From customer research: ${prospect.criteria.filter((item) => item.verdict === 'met').map((item) => item.criterion).join('; ')}`.slice(0, 500),
    };
    try {
      if (!(plan.pipeline ?? []).some((existing) => existing.id === entry.id)) await onUpdatePlan({ ...plan, pipeline: [...(plan.pipeline ?? []), entry] });
      await research.updateProspect(prospect.id, { status: 'in_pipeline', pipeline_entry_id: entry.id });
      toast.success('Added to your pipeline. You can attach it in First Customer Proof.');
    } catch { toast.error('Could not add it to your pipeline.'); }
  };

  if (research.loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>;

  if (!run || (run.status === 'failed' && !run.started_at) || run.status === 'cancelled' && !run.started_at) {
    return (
      <div className="space-y-4">
        {run?.status === 'failed' ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">{run.error_detail ?? 'We could not read your business.'}</p> : null}
        <ResearchStart defaultWebsite={defaultWebsite} busy={research.busy} onAnalyze={(input) => void research.analyze({ ...input, planId: null }).catch(onError)} />
      </div>
    );
  }
  if (run.status === 'analyzing') return <ResearchTimeline run={run} steps={research.steps} phase="analysis" />;
  if (run.status === 'needs_review') return <ResearchReview research={research} onError={onError} />;

  const working = run.status === 'queued' || run.status === 'running';
  return (
    <div className="space-y-6">
      {working
        ? <ResearchTimeline run={run} steps={research.steps} phase="research" onStop={() => void research.cancel().catch(onError)} stopping={research.busy} />
        : <ResultsHeader research={research} onNewSearch={research.startOver} />}
      {research.prospects.length ? <ProspectsTable prospects={research.prospects} onOpen={(prospect) => setOpenId(prospect.id)} /> : null}
      <ProspectSheet
        prospect={open}
        onClose={() => setOpenId(null)}
        canAddToPipeline={Boolean(plan && onUpdatePlan && primaryPlay)}
        onUpdate={research.updateProspect}
        onUpdateDraft={research.updateDraft}
        onAddToPipeline={addToPipeline}
      />
    </div>
  );
}

export type { BusinessProfile };

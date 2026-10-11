import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, MessagesSquare, ExternalLink, Copy, Check, Search, RefreshCw, Compass,
  Flame, UserPlus, Info, SlidersHorizontal, Globe, History, MonitorPlay, ChevronDown, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CreditCostNotice } from '@/components/CreditCostNotice';
import {
  useCustomerDiscovery, type PMFDiscovery, type PMFExternalMention, type PMFPerson,
  type PMFThreadCategory, type PMFValidationStage,
} from '@/hooks/useCustomerDiscovery';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDiscoveryLeads } from '@/hooks/useDiscoveryLeads';
import { upsertExternalLead } from '@/lib/pmfDiscoveryLeads';
import { firstRealName, stageQuestion, VALIDATION_STAGES } from '@/lib/pmfDiscoveryOutreach';
import PMFDiscoveryPipeline, { type PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';
import { PMFAskCommunity } from '@/components/pmf/PMFAskCommunity';

interface PMFCustomerDiscoveryProps {
  /** The PMF Lab idea the search belongs to; without it nothing can be searched or loaded. */
  validationContextId: string | null;
  originatingHandoffId?: string | null;
  defaultProductName?: string | null;
  defaultTargetAudience?: string | null;
  defaultIndustry?: string | null;
  defaultProblem?: string | null;
  onCompleted?: () => void;
  onLogInterview?: (seed: PMFInterviewLeadSeed) => void;
  /** Back to the evidence view, where logged interviews live. */
  onOpenEvidence?: () => void;
  /** Interviews logged for this idea, for the progress strip. */
  interviewsLogged?: number;
  /** A person to bring into view, from a follow-up reminder link. */
  focusLeadId?: string | null;
}

interface PublishedDemo {
  id: string;
  label: string;
  url: string;
}

const CATEGORY_LABEL: Record<PMFThreadCategory, string> = {
  pain_point: 'Pain point',
  solution_request: 'Solution request',
  money_talk: 'Money talk',
  seeking_alternatives: 'Seeking alternatives',
  hot_discussion: 'Hot discussion',
};

const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '0');

/** "1 community", "3 communities", or nothing for zero. */
const count = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : '');

const threadSourceLabel = (t: { source?: string; subreddit?: string }) =>
  t.source === 'hackernews' ? 'Hacker News' : t.subreddit ? `r/${t.subreddit}` : '';

const personDisplayName = (p: PMFPerson) => (p.source === 'hackernews' ? p.username : `u/${p.username}`);

const personCommunityLabel = (p: PMFPerson) =>
  p.source === 'hackernews' ? 'Hacker News' : p.subreddit ? `r/${p.subreddit}` : '';

const intensityTone = (i: number) =>
  i >= 5 ? 'border-destructive/30 bg-destructive-subtle text-destructive'
    : i >= 4 ? 'border-warning/30 bg-warning-subtle text-warning'
    : i >= 3 ? 'border-primary/20 bg-primary/5 text-primary'
    : 'border-border/60 bg-muted/30 text-muted-foreground';

const buildMarkdown = (d: PMFDiscovery): string => {
  const lines: string[] = [`# Customer Discovery — ${d.productName || 'PMF Lab'}`];
  if (d.painPoints.length) {
    lines.push('', '## Pain points');
    d.painPoints.forEach((p) => {
      lines.push(`- **${p.label}** (intensity ${p.intensity}/5 · ${p.threadCount} threads · ${fmt(p.totalEngagement)} engagement)`);
      if (p.summary) lines.push(`  - ${p.summary}`);
    });
  }
  if (d.people.length) {
    lines.push('', '## People to talk to');
    d.people.forEach((p) => {
      const community = personCommunityLabel(p);
      lines.push(`- ${personDisplayName(p)}${community ? ` (${community})` : ''} — ${p.permalink}`);
      if (p.painQuote) lines.push(`  - "${p.painQuote}"`);
    });
  }
  if (d.communities.length) {
    lines.push('', '## Communities');
    d.communities.forEach((c) => {
      lines.push(`- **${c.name}**${c.subscribers ? ` (${fmt(c.subscribers)} members)` : ''}${c.url ? ` — ${c.url}` : ''}`);
    });
  }
  if (d.externalMentions.length) {
    lines.push('', '## X / LinkedIn mentions (verify manually)');
    d.externalMentions.forEach((m) => {
      lines.push(`- [${m.platform === 'x' ? 'X' : 'LinkedIn'}] ${m.title} — ${m.url}`);
    });
  }
  if (d.threads.length) {
    lines.push('', '## Discussions');
    d.threads.forEach((t) => {
      const community = threadSourceLabel(t);
      lines.push(`- ${t.title}${community ? ` (${community})` : ''}${t.url ? ` — ${t.url}` : ''}`);
    });
  }
  return lines.join('\n');
};

/**
 * Customer Discovery: say who has the problem and what it is, find real people
 * who talk about it, and keep everyone in one list to work through. Two
 * required answers; everything else is optional and folded away.
 */
const PMFCustomerDiscovery: React.FC<PMFCustomerDiscoveryProps> = ({
  validationContextId, originatingHandoffId, defaultProductName, defaultTargetAudience, defaultIndustry, defaultProblem,
  onCompleted, onLogInterview, onOpenEvidence, interviewsLogged = 0, focusLeadId = null,
}) => {
  const { user } = useAuth();
  const { activeProject } = useProjects();
  // Default-on with a PostHog kill switch: only an explicit `false` flag disables.
  const searchV2Enabled = useFeatureFlagEnabled('pmf-discovery-search-v2') !== false;
  const pipelineEnabled = useFeatureFlagEnabled('pmf-discovery-pipeline-v1') !== false;
  // Since 1 Aug 2026 the hook needs the idea; called without it, every search
  // stopped at "Sign in to find customers to talk to."
  const { discovery, discoveryError, isGenerating, generateDiscovery, loadDiscovery, runs } = useCustomerDiscovery(validationContextId, originatingHandoffId);
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [industry, setIndustry] = useState('');
  const [problem, setProblem] = useState('');
  const [stage, setStage] = useState<PMFValidationStage>('problem_discovery');
  const [demos, setDemos] = useState<PublishedDemo[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PMFThreadCategory>('all');
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('year');
  const [includeSubreddits, setIncludeSubreddits] = useState('');
  const [excludeSubreddits, setExcludeSubreddits] = useState('');
  const [savedMentions, setSavedMentions] = useState<Record<string, boolean>>({});
  const [savingMention, setSavingMention] = useState<string | null>(null);
  // The list lives here so the page can follow it: someone with people to
  // work through sees them first, and the search folds to one line.
  const leadsApi = useDiscoveryLeads(pipelineEnabled);
  const returning = leadsApi.leads.some((lead) => lead.status !== 'dismissed');
  const [searchOpen, setSearchOpen] = useState<boolean | null>(null);
  const showSearch = searchOpen ?? !returning;
  const [toContactSignal, setToContactSignal] = useState(0);

  useEffect(() => {
    if (discovery) {
      // A placeholder idea name ("Unscoped evidence case") describes nothing.
      setProduct((prev) => prev || firstRealName(discovery.productName));
      setAudience((prev) => prev || discovery.targetAudience);
      setProblem((prev) => prev || discovery.problem);
      const loadedStage = discovery.queryMeta?.validationStage;
      if (loadedStage) setStage((prev) => (prev === 'problem_discovery' ? loadedStage : prev));
    }
  }, [discovery]);

  useEffect(() => {
    const productName = firstRealName(defaultProductName, activeProject?.title);
    if (productName) setProduct((prev) => prev || productName);
    if (defaultTargetAudience) setAudience((prev) => prev || defaultTargetAudience);
    if (defaultIndustry) setIndustry((prev) => prev || defaultIndustry);
    if (defaultProblem) setProblem((prev) => prev || defaultProblem);
  }, [defaultProductName, activeProject?.title, defaultTargetAudience, defaultIndustry, defaultProblem]);

  // Published demos power the "Would they try my solution?" message.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('waitlist_pages')
          .select('id, product_name, title, slug, published_url, published_at')
          .eq('user_id', user.id)
          .not('published_at', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(5);
        if (cancelled || error || !data) return;
        setDemos((data as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          label: (row.product_name as string) || (row.title as string) || 'Untitled demo',
          url: (row.published_url as string) || (row.slug ? `${window.location.origin}/w/${row.slug}` : ''),
        })).filter((demo) => demo.url));
      } catch {
        // Demo attach is optional decoration; never block discovery on it.
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const selectedDemo = demos.find((demo) => demo.id === selectedDemoId) || null;
  const missing = [!audience.trim() && 'who has the problem', !problem.trim() && 'what the problem is'].filter(Boolean) as string[];
  const ready = missing.length === 0;

  const hasResults = Boolean(
    discovery && (discovery.painPoints.length || discovery.people.length || discovery.communities.length || discovery.threads.length),
  );
  const redditAvailable = discovery?.sourceMeta?.redditAvailable !== false;
  const moreCount = discovery
    ? discovery.painPoints.length + discovery.communities.length + discovery.externalMentions.length + discovery.threads.length
    : 0;

  const threadCategories = useMemo(() => {
    const set = new Set<PMFThreadCategory>();
    discovery?.threads.forEach((t) => t.category && set.add(t.category));
    return Array.from(set);
  }, [discovery]);

  const visibleThreads = useMemo(() => {
    const threads = discovery?.threads ?? [];
    return categoryFilter === 'all' ? threads : threads.filter((t) => t.category === categoryFilter);
  }, [discovery, categoryFilter]);

  const handleGenerate = async () => {
    if (!ready) return;
    const splitSubreddits = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
    const result = await generateDiscovery({
      product,
      audience,
      industry,
      problem,
      searchVersion: searchV2Enabled ? 2 : 1,
      validationStage: stage,
      filters: searchV2Enabled ? {
        timeRange,
        includeSubreddits: splitSubreddits(includeSubreddits).slice(0, 5),
        excludeSubreddits: splitSubreddits(excludeSubreddits).slice(0, 20),
      } : undefined,
    });
    if (result) {
      onCompleted?.();
      // The people found are already in the list: open it on To contact.
      await leadsApi.reload();
      setSearchOpen(false);
      setToContactSignal((signal) => signal + 1);
      window.setTimeout(() => document.getElementById('conversations-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  };

  const copy = async (text: string, onDone: () => void) => {
    try { await navigator.clipboard.writeText(text); onDone(); toast.success('Copied.'); }
    catch { toast.error('Could not copy. Select the text manually.'); }
  };

  const saveMention = async (mention: PMFExternalMention) => {
    if (!user) return;
    setSavingMention(mention.url);
    try {
      await upsertExternalLead(user.id, mention);
      setSavedMentions((current) => ({ ...current, [mention.url]: true }));
      toast.success('Added to Your conversations.');
      void leadsApi.reload();
    } catch (error) {
      console.warn('Failed to save external mention:', error);
      toast.error('Could not save this person.');
    } finally {
      setSavingMention(null);
    }
  };

  const intro = (
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary shrink-0">
          <Compass className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Customer discovery</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Find real people who have the problem you solve, then turn them into conversations. Ask founders in
            Rooms for free, or search Reddit, Hacker News and the web, and keep everyone in one list to work through.
          </p>
        </div>
      </div>
  );

  // Who to talk to, and the two ways to find them.
  const searchSection = (
      <div id="discovery-search" className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-5">
        {returning && (
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Find more people</p>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setSearchOpen(false)}>Done</button>
          </div>
        )}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">What do you want to find out?</legend>
          <div className="flex flex-wrap gap-1.5">
            {VALIDATION_STAGES.map((option) => (
              <button key={option.value} type="button" onClick={() => setStage(option.value)} aria-pressed={stage === option.value}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  stage === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground',
                )}>
                {option.question}
              </button>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">{VALIDATION_STAGES.find((option) => option.value === stage)?.hint}</p>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="cd-audience" className="text-sm font-semibold">Who has this problem?</Label>
          <Input id="cd-audience" value={audience} onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. freelance designers" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cd-problem" className="text-sm font-semibold">What problem do they have?</Label>
          <Textarea id="cd-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3}
            placeholder="In their words, e.g. clients pay invoices weeks late and chasing them takes hours." />
        </div>

        {stage === 'solution_validation' && demos.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="cd-demo" className="text-xs flex items-center gap-1">
              <MonitorPlay className="h-3 w-3" /> Attach a demo to your outreach
            </Label>
            <select id="cd-demo" className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedDemoId} onChange={(event) => setSelectedDemoId(event.target.value)}>
              <option value="">No demo link</option>
              {demos.map((demo) => <option key={demo.id} value={demo.id}>{demo.label}</option>)}
            </select>
          </div>
        )}

        <details className="group rounded-xl border border-border/60 bg-muted/20 p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" /> More detail <span className="font-normal text-muted-foreground">(optional)</span>
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cd-product" className="text-xs">Your product</Label>
                <Input id="cd-product" value={product} onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. an invoicing tool for freelance designers" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-industry" className="text-xs">Industry</Label>
                <Input id="cd-industry" value={industry} onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. fintech, creator economy" />
              </div>
            </div>
            {searchV2Enabled && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cd-time" className="text-xs">Posts from</Label>
                  <select id="cd-time" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={timeRange} onChange={(event) => setTimeRange(event.target.value as typeof timeRange)}>
                    <option value="month">Past month</option><option value="year">Past year</option><option value="all">Any time</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd-include" className="text-xs">Only these subreddits</Label>
                  <Input id="cd-include" value={includeSubreddits} onChange={(event) => setIncludeSubreddits(event.target.value)} placeholder="startups, saas" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd-exclude" className="text-xs">Skip these subreddits</Label>
                  <Input id="cd-exclude" value={excludeSubreddits} onChange={(event) => setExcludeSubreddits(event.target.value)} placeholder="jobs, selfpromo" />
                </div>
              </div>
            )}
          </div>
        </details>

        {/* Two ways to find people: free in Rooms first, then the paid web search. */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Find people to talk to</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <PMFAskCommunity validationContextId={validationContextId} stage={stage} audience={audience} problem={problem}
              onLeadAdded={() => void leadsApi.reload()} />
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4 text-primary" aria-hidden="true" />Search Reddit, Hacker News and the web</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Find people who described this problem in public, with a message ready for each.</p>
              </div>
              <CreditCostNotice feature="PMF_DISCOVERY" featureName="PMF Customer Discovery" />
              <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !ready}>
                {hasResults ? <RefreshCw className={cn('mr-2 h-4 w-4', isGenerating && 'animate-spin')} /> : <Search className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Searching…' : hasResults ? 'Search again' : 'Search for people'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!ready && <p className="text-xs text-muted-foreground">Add {missing.join(' and ')} to start.</p>}
          {runs.length > 1 && (
            <div className="ml-auto flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={discovery?.id || ''}
                onChange={(event) => { if (event.target.value) void loadDiscovery(event.target.value); }}
                aria-label="Scan history">
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.createdAt).toLocaleDateString()} · {firstRealName(run.productName) || run.targetAudience || 'Search'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
  );

  // Folded search for someone with people to work through: one line, one button.
  const searchSummary = (
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Looking for · {stageQuestion(stage)}</p>
            <p className="truncate text-sm font-medium">{audience.trim() || 'Who has the problem is not set'}</p>
            {problem.trim() && <p className="truncate text-xs text-muted-foreground">{problem}</p>}
          </div>
          <Button variant="outline" onClick={() => {
            setSearchOpen(true);
            window.setTimeout(() => document.getElementById('discovery-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
          }}>
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />Find more people
          </Button>
        </div>
        <PMFAskCommunity compact validationContextId={validationContextId} stage={stage} audience={audience} problem={problem}
          onExpand={() => setSearchOpen(true)} />
      </div>
  );

  const resultsSection = (<>
      {discoveryError && (
        <div className="rounded-xl border border-warning/30 bg-warning-subtle p-4 flex items-start gap-2" role="alert">
          <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {discoveryError.errorCode === 'NO_LEADS_FOUND' || discoveryError.errorCode === 'NO_USABLE_LEADS'
                ? 'No matching people found'
                : discoveryError.errorCode.startsWith('REDDIT_')
                  ? 'Reddit search unavailable'
                  : 'The search could not finish'}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{discoveryError.message}</p>
            <p className="text-caption text-muted-foreground">
              {discoveryError.creditsUsed > 0 && !discoveryError.refunded
                ? `${discoveryError.creditsUsed} credits require support review.`
                : 'No credits were used for this search.'}
            </p>
          </div>
        </div>
      )}

      {!discoveryError && discovery && !hasResults && (
        <div className="rounded-xl border border-warning/30 bg-warning-subtle p-4 flex items-start gap-2" role="status">
          <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">This saved search found no one to talk to</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Search again. Empty results are not charged.
            </p>
          </div>
        </div>
      )}

      {hasResults && discovery && (
        <div className="space-y-6">
          {(discovery.queryMeta?.partial || !redditAvailable) && (
            <div className="rounded-xl border border-warning/25 bg-warning-subtle p-4 flex items-start gap-2">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-foreground">
                {!redditAvailable
                  ? 'Reddit was unavailable for this search, so these results come from a web search, without upvotes, comment counts or people to contact. Try again shortly.'
                  : 'Some sources did not answer, so this search may have missed people. You can search again.'}
              </p>
            </div>
          )}

          {/* The people themselves live in Your conversations: one place to act. */}
          {discovery.people.length > 0 && pipelineEnabled && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                This search found {count(discovery.people.length, 'person', 'people')}. They are in Your conversations under To contact,
                marked "From your latest search".
              </span>
            </p>
          )}

          {moreCount > 0 && (
            <details className="group rounded-2xl border border-border/60 bg-background/40 p-4" open={discovery.people.length === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                More from this search
                <span className="font-normal text-muted-foreground">
                  {[
                    count(discovery.painPoints.length, 'pain point', 'pain points'),
                    count(discovery.communities.length, 'community', 'communities'),
                    count(discovery.threads.length, 'discussion', 'discussions'),
                  ].filter(Boolean).join(' · ')}
                </span>
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-4 space-y-6">
                {discovery.painPoints.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-destructive shrink-0" />
                      <h3 className="text-sm font-semibold">Top pain points ({discovery.painPoints.length})</h3>
                    </div>
                    <div className="space-y-2.5">
                      {discovery.painPoints.map((p, i) => (
                        <div key={i} className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{p.label}</p>
                            <Badge variant="outline" className={cn('text-caption shrink-0', intensityTone(p.intensity))}>
                              Intensity {p.intensity}/5
                            </Badge>
                          </div>
                          {p.summary && <p className="text-xs leading-relaxed text-muted-foreground">{p.summary}</p>}
                          {p.exampleQuote && <p className="text-xs italic text-muted-foreground line-clamp-2">"{p.exampleQuote}"</p>}
                          {(p.threadCount > 0 || p.totalEngagement > 0) && (
                            <p className="text-caption text-muted-foreground">
                              {p.threadCount} thread{p.threadCount === 1 ? '' : 's'} · ▲ {fmt(p.totalEngagement)} total engagement
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discovery.communities.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-semibold">Communities to join ({discovery.communities.length})</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {discovery.communities.map((c, i) => (
                        <div key={`${c.name}-${i}`} className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                            <Badge variant="outline" className={cn('text-caption shrink-0', c.source === 'reddit' ? 'bg-primary/10 text-primary border-primary/20' : '')}>
                              {c.source === 'reddit' ? 'Reddit' : (c.platform || 'Web')}
                            </Badge>
                          </div>
                          {typeof c.subscribers === 'number' && c.subscribers > 0 && (
                            <p className="text-caption text-muted-foreground">{fmt(c.subscribers)} members</p>
                          )}
                          {c.whyRelevant && <p className="text-xs leading-relaxed text-muted-foreground">{c.whyRelevant}</p>}
                          {c.howToEngage && (
                            <p className="text-xs leading-relaxed text-foreground">
                              <span className="font-medium text-primary/80">How to show up: </span>{c.howToEngage}
                            </p>
                          )}
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline min-w-0">
                              <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{c.url}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discovery.externalMentions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-info shrink-0" />
                      <h3 className="text-sm font-semibold">On X and LinkedIn ({discovery.externalMentions.length})</h3>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      Found by web search, so less certain than the people above. Open and check before reaching out.
                    </p>
                    <div className="grid gap-2.5 md:grid-cols-2">
                      {discovery.externalMentions.map((mention) => (
                        <div key={mention.url} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{mention.title}</p>
                            <Badge variant="outline" className="text-caption shrink-0">{mention.platform === 'x' ? 'X' : 'LinkedIn'}</Badge>
                          </div>
                          {mention.snippet && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{mention.snippet}</p>}
                          <div className="flex flex-wrap gap-3 pt-1">
                            <a href={mention.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" /> Open post
                            </a>
                            <button type="button"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                              disabled={savingMention === mention.url || savedMentions[mention.url]}
                              onClick={() => void saveMention(mention)}>
                              {savedMentions[mention.url] ? <Check className="h-3 w-3 text-success" /> : <UserPlus className="h-3 w-3" />}
                              {savedMentions[mention.url] ? 'In your list' : 'Add to your list'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discovery.threads.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessagesSquare className="h-4 w-4 text-info shrink-0" />
                      <h3 className="text-sm font-semibold">Discussions ({discovery.threads.length})</h3>
                    </div>
                    {threadCategories.length > 1 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(['all', ...threadCategories] as const).map((cat) => (
                          <button key={cat} type="button" onClick={() => setCategoryFilter(cat)}
                            className={cn(
                              'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
                              categoryFilter === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground',
                            )}>
                            {cat === 'all' ? 'All' : CATEGORY_LABEL[cat]}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {visibleThreads.map((t, i) => (
                        <div key={t.id || i} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{t.title}</p>
                            <div className="flex shrink-0 gap-1">
                              {t.isNew && <Badge variant="outline" className="text-caption border-success/30 text-success">New</Badge>}
                              {t.category && <Badge variant="outline" className="text-caption">{CATEGORY_LABEL[t.category]}</Badge>}
                            </div>
                          </div>
                          <p className="text-caption text-muted-foreground">
                            {threadSourceLabel(t) ? `${threadSourceLabel(t)} · ` : ''}
                            {typeof t.upvotes === 'number' ? `▲ ${fmt(t.upvotes)} · ` : ''}
                            {typeof t.comments === 'number' ? `💬 ${fmt(t.comments)}` : ''}
                            {typeof t.ageDays === 'number' && t.ageDays >= 0 ? ` · ${t.ageDays}d ago` : ''}
                          </p>
                          {t.snippet && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{t.snippet}</p>}
                          {t.outreachAngle && (
                            <p className="text-xs leading-relaxed text-foreground">
                              <span className="font-medium text-primary/80">Your angle: </span>{t.outreachAngle}
                            </p>
                          )}
                          {t.url && (
                            <a href={t.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline min-w-0">
                              <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{t.url}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button size="sm" variant="outline" onClick={() => copy(buildMarkdown(discovery), () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); })}>
                  {copiedAll ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedAll ? 'Copied' : 'Copy the whole search'}
                </Button>
              </div>
            </details>
          )}
        </div>
      )}
  </>);

  const conversations = pipelineEnabled && (
    <PMFDiscoveryPipeline
      api={leadsApi}
      latestDiscoveryId={discovery?.id ?? null}
      showToContactSignal={toContactSignal}
      onLogInterview={onLogInterview}
      onOpenEvidence={onOpenEvidence}
      interviewsLogged={interviewsLogged}
      focusLeadId={focusLeadId}
      stage={stage}
      messageTemplate={discovery?.dmTemplate}
      demoUrl={selectedDemo?.url}
    />
  );

  // Wait for the list before choosing a layout, so the page does not jump.
  if (pipelineEnabled && !leadsApi.loaded) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading your conversations" />
      </div>
    );
  }

  // Someone with people to work through sees them first; the search folds to one line.
  return returning ? (
    <div className="max-w-3xl mx-auto space-y-6">
      {conversations}
      {showSearch ? searchSection : searchSummary}
      {resultsSection}
    </div>
  ) : (
    <div className="max-w-3xl mx-auto space-y-6">
      {intro}
      {searchSection}
      {resultsSection}
      {conversations}
    </div>
  );
};

export default PMFCustomerDiscovery;

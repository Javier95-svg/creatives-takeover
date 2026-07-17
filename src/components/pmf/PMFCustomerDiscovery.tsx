import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, MessagesSquare, ExternalLink, Copy, Check, Search, RefreshCw, Compass,
  Flame, UserPlus, Info, SlidersHorizontal, Globe, History, MonitorPlay,
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
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logDiscoveryLeadActivity, upsertExternalLead } from '@/lib/pmfDiscoveryLeads';
import PMFCommunityMatches from '@/components/pmf/PMFCommunityMatches';
import PMFDiscoveryPipeline, { type PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';

interface PMFCustomerDiscoveryProps {
  defaultProductName?: string | null;
  defaultTargetAudience?: string | null;
  defaultIndustry?: string | null;
  defaultProblem?: string | null;
  onCompleted?: () => void;
  onLogInterview?: (seed: PMFInterviewLeadSeed) => void;
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

const STAGE_OPTIONS: Array<{ value: PMFValidationStage; label: string; hint: string }> = [
  {
    value: 'problem_discovery',
    label: 'Problem discovery',
    hint: 'Find people feeling the pain so you can interview them — no pitch.',
  },
  {
    value: 'solution_validation',
    label: 'Solution validation',
    hint: 'Find people actively looking for a fix so you can show your demo.',
  },
  {
    value: 'pricing',
    label: 'Pricing signals',
    hint: 'Find people talking about costs and budgets to test willingness to pay.',
  },
];

const STAGE_DEFAULT_DM: Record<PMFValidationStage, string> = {
  problem_discovery:
    "Hi {{name}}, I saw your post in {{community}} about this exact problem. I'm researching it and would love to hear more about your experience — no pitch, just trying to learn. Would you be open to a couple of questions?",
  solution_validation:
    "Hi {{name}}, I saw your post in {{community}} about this exact problem. I've built an early demo that tries to solve it and I'm looking for honest, critical feedback — would you be open to taking a quick look?{{demo}}",
  pricing:
    "Hi {{name}}, I saw your post in {{community}} about this problem. I'm researching how people handle it today — would you be open to sharing what solving it currently costs you (time or money)? No pitch.",
};

const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '0');

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

const PMFCustomerDiscovery: React.FC<PMFCustomerDiscoveryProps> = ({
  defaultProductName, defaultTargetAudience, defaultIndustry, defaultProblem, onCompleted, onLogInterview,
}) => {
  const { user } = useAuth();
  // Default-on with a PostHog kill switch: only an explicit `false` flag disables.
  const searchV2Enabled = useFeatureFlagEnabled('pmf-discovery-search-v2') !== false;
  const pipelineEnabled = useFeatureFlagEnabled('pmf-discovery-pipeline-v1') !== false;
  const { discovery, discoveryError, isGenerating, generateDiscovery, loadDiscovery, runs } = useCustomerDiscovery();
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [industry, setIndustry] = useState('');
  const [problem, setProblem] = useState('');
  const [stage, setStage] = useState<PMFValidationStage>('problem_discovery');
  const [demos, setDemos] = useState<PublishedDemo[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedDm, setCopiedDm] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PMFThreadCategory>('all');
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('year');
  const [includeSubreddits, setIncludeSubreddits] = useState('');
  const [excludeSubreddits, setExcludeSubreddits] = useState('');
  const [matchesKey, setMatchesKey] = useState(0);
  const [savedMentions, setSavedMentions] = useState<Record<string, boolean>>({});
  const [savingMention, setSavingMention] = useState<string | null>(null);

  useEffect(() => {
    if (discovery) {
      setProduct((prev) => prev || discovery.productName);
      setAudience((prev) => prev || discovery.targetAudience);
      setProblem((prev) => prev || discovery.problem);
      const loadedStage = discovery.queryMeta?.validationStage;
      if (loadedStage) setStage((prev) => (prev === 'problem_discovery' ? loadedStage : prev));
    }
  }, [discovery]);

  useEffect(() => {
    if (defaultProductName) setProduct((prev) => prev || defaultProductName);
    if (defaultTargetAudience) setAudience((prev) => prev || defaultTargetAudience);
    if (defaultIndustry) setIndustry((prev) => prev || defaultIndustry);
    if (defaultProblem) setProblem((prev) => prev || defaultProblem);
  }, [defaultProductName, defaultTargetAudience, defaultIndustry, defaultProblem]);

  // Published demos power the solution-validation outreach template.
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

  const hasResults = Boolean(
    discovery && (discovery.painPoints.length || discovery.people.length || discovery.communities.length || discovery.threads.length),
  );
  const redditAvailable = discovery?.sourceMeta?.redditAvailable !== false;

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
      setMatchesKey((key) => key + 1);
      onCompleted?.();
    }
  };

  const copy = async (text: string, onDone: () => void) => {
    try { await navigator.clipboard.writeText(text); onDone(); toast.success('Copied.'); }
    catch { toast.error('Could not copy. Select the text manually.'); }
  };

  const dmFor = (p: PMFPerson) => {
    const community = personCommunityLabel(p) || 'your community';
    const demoLink = stage === 'solution_validation' && selectedDemo ? ` Here it is: ${selectedDemo.url}` : '';
    let template = discovery?.dmTemplate || STAGE_DEFAULT_DM[stage];
    template = template
      .replace(/\{\{\s*(subreddit|community)\s*\}\}/gi, community)
      .replace(/\{\{\s*name\s*\}\}/gi, personDisplayName(p));
    if (/\{\{\s*demo\s*\}\}/i.test(template)) {
      template = template.replace(/\{\{\s*demo\s*\}\}/gi, demoLink);
    } else if (demoLink) {
      template = `${template}${demoLink}`;
    }
    return template;
  };

  const copyDm = (person: PMFPerson) => copy(dmFor(person), () => {
    setCopiedDm(person.username);
    setTimeout(() => setCopiedDm(null), 2000);
    if (user && person.leadId) {
      void logDiscoveryLeadActivity(user.id, person.leadId, 'outreach_copied').catch((error) => {
        console.warn('Failed to log discovery outreach copy:', error);
      });
    }
  });

  const saveMention = async (mention: PMFExternalMention) => {
    if (!user) return;
    setSavingMention(mention.url);
    try {
      await upsertExternalLead(user.id, mention);
      setSavedMentions((current) => ({ ...current, [mention.url]: true }));
      toast.success('Saved to your discovery pipeline.');
    } catch (error) {
      console.warn('Failed to save external mention:', error);
      toast.error('Could not save this lead.');
    } finally {
      setSavingMention(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Intro */}
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary shrink-0">
          <Compass className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Customer discovery</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We match you with founders on the platform and scan real discussions on Reddit, Hacker News, and the wider
            web to surface the strongest pain points and the actual people you can talk to today — tuned to where your
            project is in validation.
          </p>
        </div>
      </div>

      {/* Input form */}
      <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-4">
        {/* Validation stage */}
        <div className="space-y-2">
          <Label className="text-xs">What are you validating right now?</Label>
          <div className="flex flex-wrap gap-1.5">
            {STAGE_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setStage(option.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
                  stage === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground',
                )}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">{STAGE_OPTIONS.find((option) => option.value === stage)?.hint}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cd-product" className="text-xs">Product</Label>
            <Input id="cd-product" value={product} onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. an invoicing tool for freelance designers" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-audience" className="text-xs">Target audience</Label>
            <Input id="cd-audience" value={audience} onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. freelance designers" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cd-industry" className="text-xs">Industry</Label>
            <Input id="cd-industry" value={industry} onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. fintech, creator economy" />
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cd-problem" className="text-xs">Problem / pain you solve</Label>
          <Textarea id="cd-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3}
            placeholder="Describe the specific pain in your customers' words — the more specific, the better the matches." />
        </div>

        {searchV2Enabled && (
          <details className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4" /> Search filters
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cd-time" className="text-xs">Time range</Label>
                <select id="cd-time" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={timeRange} onChange={(event) => setTimeRange(event.target.value as typeof timeRange)}>
                  <option value="month">Past month</option><option value="year">Past year</option><option value="all">All time</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-include" className="text-xs">Include subreddits</Label>
                <Input id="cd-include" value={includeSubreddits} onChange={(event) => setIncludeSubreddits(event.target.value)} placeholder="startups, saas" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-exclude" className="text-xs">Exclude subreddits</Label>
                <Input id="cd-exclude" value={excludeSubreddits} onChange={(event) => setExcludeSubreddits(event.target.value)} placeholder="jobs, selfpromo" />
              </div>
            </div>
          </details>
        )}

        <CreditCostNotice feature="PMF_DISCOVERY" featureName="PMF Customer Discovery" />

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {hasResults ? <RefreshCw className={cn('mr-2 h-4 w-4', isGenerating && 'animate-spin')} /> : <Search className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Scanning sources…' : hasResults ? 'Regenerate' : 'Find customers to talk to'}
          </Button>
          {hasResults && discovery && (
            <Button size="sm" variant="outline" onClick={() => copy(buildMarkdown(discovery), () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); })}>
              {copiedAll ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedAll ? 'Copied' : 'Copy all'}
            </Button>
          )}
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
                    {new Date(run.createdAt).toLocaleDateString()} · {run.productName || run.targetAudience || 'Scan'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Platform members — the warmest source, shown before external scans. */}
      <PMFCommunityMatches industry={industry} audience={audience} problem={problem} refreshKey={matchesKey} />

      {discoveryError && (
        <div className="rounded-xl border border-warning/30 bg-warning-subtle p-4 flex items-start gap-2" role="alert">
          <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {discoveryError.errorCode === 'NO_LEADS_FOUND' || discoveryError.errorCode === 'NO_USABLE_LEADS'
                ? 'No matching leads found'
                : discoveryError.errorCode.startsWith('REDDIT_')
                  ? 'Reddit scan unavailable'
                  : 'Customer discovery could not finish'}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{discoveryError.message}</p>
            <p className="text-caption text-muted-foreground">
              {discoveryError.creditsUsed > 0 && !discoveryError.refunded
                ? `${discoveryError.creditsUsed} credits require support review.`
                : 'No credits were used for this run.'}
            </p>
          </div>
        </div>
      )}

      {!discoveryError && discovery && !hasResults && (
        <div className="rounded-xl border border-warning/30 bg-warning-subtle p-4 flex items-start gap-2" role="status">
          <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">This saved run contains no usable leads</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Run the scan again. Empty results are no longer treated as completed or charged work.
            </p>
          </div>
        </div>
      )}

      {hasResults && discovery && (
        <div className="space-y-6">
          {discovery.queryMeta && (
            <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
              <Badge variant="outline">Search v{discovery.queryMeta.searchVersion}</Badge>
              {discovery.queryMeta.validationStage && (
                <Badge variant="outline">{STAGE_OPTIONS.find((option) => option.value === discovery.queryMeta?.validationStage)?.label || discovery.queryMeta.validationStage}</Badge>
              )}
              <Badge variant="outline">{discovery.queryMeta.requestsSucceeded}/{discovery.queryMeta.requestsAttempted} source requests</Badge>
              {(discovery.sourceMeta?.hackernewsThreads ?? 0) > 0 && <Badge variant="outline">+{discovery.sourceMeta.hackernewsThreads} Hacker News</Badge>}
              <Badge variant="outline">{(discovery.queryMeta.durationMs / 1000).toFixed(1)}s</Badge>
              {discovery.queryMeta.partial && <Badge variant="outline" className="border-warning/30 text-warning">Partial source coverage</Badge>}
            </div>
          )}
          {!redditAvailable && (
            <div className="rounded-xl border border-warning/25 bg-warning-subtle p-4 flex items-start gap-2">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-foreground">
                Live Reddit data was unavailable for this run, so these results are based on a web search — without
                upvotes, comment counts, or a people-to-contact list. Try again shortly.
              </p>
            </div>
          )}

          {/* 1 — Pain points */}
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

          {/* 2 — People to talk to */}
          {discovery.people.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold">People to talk to ({discovery.people.length})</h3>
              </div>
              <p className="text-caption text-muted-foreground">
                Real people who voiced this pain publicly. Engage authentically — read their post, be helpful, and ask to learn (don't pitch or spam).
              </p>
              <div className="grid gap-2.5 md:grid-cols-2">
                {discovery.people.map((p, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{personDisplayName(p)}</p>
                      {personCommunityLabel(p) && <Badge variant="outline" className="text-caption shrink-0">{personCommunityLabel(p)}</Badge>}
                    </div>
                    {p.painQuote && <p className="text-xs italic text-muted-foreground line-clamp-3">"{p.painQuote}"</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> View post
                        </a>
                      )}
                      <button type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => copyDm(p)}>
                        {copiedDm === p.username ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        {copiedDm === p.username ? 'Copied' : 'Copy DM'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 — Communities */}
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

          {/* 4 — X / LinkedIn mentions (verify manually) */}
          {discovery.externalMentions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-info shrink-0" />
                <h3 className="text-sm font-semibold">On X and LinkedIn ({discovery.externalMentions.length})</h3>
              </div>
              <p className="text-caption text-muted-foreground">
                Public posts surfaced by web search — lower confidence than the sources above, so open and verify before
                reaching out.
              </p>
              <div className="grid gap-2.5 md:grid-cols-2">
                {discovery.externalMentions.map((mention) => (
                  <div key={mention.url} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{mention.title}</p>
                      <Badge variant="outline" className="text-caption shrink-0">{mention.platform === 'x' ? 'X' : 'LinkedIn'}</Badge>
                    </div>
                    {mention.snippet && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{mention.snippet}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a href={mention.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Open post
                      </a>
                      <button type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                        disabled={savingMention === mention.url || savedMentions[mention.url]}
                        onClick={() => void saveMention(mention)}>
                        {savedMentions[mention.url] ? <Check className="h-3 w-3 text-success" /> : <UserPlus className="h-3 w-3" />}
                        {savedMentions[mention.url] ? 'In pipeline' : 'Save as lead'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 — Live discussions (with category filter) */}
          {discovery.threads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-info shrink-0" />
                <h3 className="text-sm font-semibold">Live discussions ({discovery.threads.length})</h3>
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
                        {typeof t.rankScore === 'number' && <Badge variant="outline" className="text-caption">Score {t.rankScore}</Badge>}
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
                    {t.rankingReason && <p className="text-caption font-medium text-primary/80">Why it ranks: {t.rankingReason}</p>}
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

          <p className="text-xs text-muted-foreground text-center">
            Go talk to these people, then bring what you learn back into <span className="font-medium text-foreground">Score my evidence</span>.
          </p>
        </div>
      )}
      {pipelineEnabled && <PMFDiscoveryPipeline key={discovery?.id || 'pipeline'} onLogInterview={onLogInterview} />}
    </div>
  );
};

export default PMFCustomerDiscovery;

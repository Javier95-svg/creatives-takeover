import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, MessagesSquare, ExternalLink, Copy, Check, Search, RefreshCw, Compass,
  Flame, UserPlus, Info,
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
  useCustomerDiscovery, type PMFDiscovery, type PMFPerson, type PMFThreadCategory,
} from '@/hooks/useCustomerDiscovery';

interface PMFCustomerDiscoveryProps {
  defaultProductName?: string | null;
  defaultTargetAudience?: string | null;
  onCompleted?: () => void;
}

const CATEGORY_LABEL: Record<PMFThreadCategory, string> = {
  pain_point: 'Pain point',
  solution_request: 'Solution request',
  money_talk: 'Money talk',
  seeking_alternatives: 'Seeking alternatives',
  hot_discussion: 'Hot discussion',
};

const DEFAULT_DM =
  "Hi {{name}}, I saw your post in {{subreddit}} about this exact problem. I'm researching it and would love to hear more about your experience — no pitch, just trying to learn. Would you be open to a couple of questions?";

const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '0');

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
      lines.push(`- u/${p.username}${p.subreddit ? ` (r/${p.subreddit})` : ''} — ${p.permalink}`);
      if (p.painQuote) lines.push(`  - "${p.painQuote}"`);
    });
  }
  if (d.communities.length) {
    lines.push('', '## Communities');
    d.communities.forEach((c) => {
      lines.push(`- **${c.name}**${c.subscribers ? ` (${fmt(c.subscribers)} members)` : ''}${c.url ? ` — ${c.url}` : ''}`);
    });
  }
  if (d.threads.length) {
    lines.push('', '## Discussions');
    d.threads.forEach((t) => {
      lines.push(`- ${t.title}${t.subreddit ? ` (r/${t.subreddit})` : ''}${t.url ? ` — ${t.url}` : ''}`);
    });
  }
  return lines.join('\n');
};

const PMFCustomerDiscovery: React.FC<PMFCustomerDiscoveryProps> = ({ defaultProductName, defaultTargetAudience, onCompleted }) => {
  const { discovery, discoveryError, isGenerating, generateDiscovery } = useCustomerDiscovery();
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [problem, setProblem] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedDm, setCopiedDm] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PMFThreadCategory>('all');

  useEffect(() => {
    if (discovery) {
      setProduct((prev) => prev || discovery.productName);
      setAudience((prev) => prev || discovery.targetAudience);
      setProblem((prev) => prev || discovery.problem);
    }
  }, [discovery]);

  useEffect(() => {
    if (defaultProductName) setProduct((prev) => prev || defaultProductName);
    if (defaultTargetAudience) setAudience((prev) => prev || defaultTargetAudience);
  }, [defaultProductName, defaultTargetAudience]);

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
    const result = await generateDiscovery({ product, audience, problem });
    if (result) onCompleted?.();
  };

  const copy = async (text: string, onDone: () => void) => {
    try { await navigator.clipboard.writeText(text); onDone(); toast.success('Copied.'); }
    catch { toast.error('Could not copy. Select the text manually.'); }
  };

  const dmFor = (p: PMFPerson) =>
    (discovery?.dmTemplate || DEFAULT_DM)
      .replace(/\{\{\s*subreddit\s*\}\}/gi, p.subreddit ? `r/${p.subreddit}` : 'your community')
      .replace(/\{\{\s*name\s*\}\}/gi, `u/${p.username}`);

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
            We scan real Reddit discussions to surface the strongest pain points, the live threads behind them, and the
            actual people you can talk to today — so you know exactly where to go gather evidence.
          </p>
        </div>
      </div>

      {/* Input form */}
      <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-4">
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
        <div className="space-y-1.5">
          <Label htmlFor="cd-problem" className="text-xs">Problem / pain you solve</Label>
          <Textarea id="cd-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3}
            placeholder="Describe the specific pain in your customers' words — the more specific, the better the matches." />
        </div>

        <CreditCostNotice feature="PMF_DISCOVERY" featureName="PMF Customer Discovery" />

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {hasResults ? <RefreshCw className={cn('mr-2 h-4 w-4', isGenerating && 'animate-spin')} /> : <Search className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Scanning Reddit…' : hasResults ? 'Regenerate' : 'Find customers to talk to'}
          </Button>
          {hasResults && discovery && (
            <Button size="sm" variant="outline" onClick={() => copy(buildMarkdown(discovery), () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); })}>
              {copiedAll ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedAll ? 'Copied' : 'Copy all'}
            </Button>
          )}
        </div>
      </div>

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
                      <p className="text-sm font-semibold text-foreground">u/{p.username}</p>
                      {p.subreddit && <Badge variant="outline" className="text-caption shrink-0">r/{p.subreddit}</Badge>}
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
                        onClick={() => copy(dmFor(p), () => { setCopiedDm(p.username); setTimeout(() => setCopiedDm(null), 2000); })}>
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

          {/* 4 — Live discussions (with category filter) */}
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
                      {t.category && (
                        <Badge variant="outline" className="text-caption shrink-0">{CATEGORY_LABEL[t.category]}</Badge>
                      )}
                    </div>
                    <p className="text-caption text-muted-foreground">
                      {t.subreddit ? `r/${t.subreddit} · ` : ''}
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

          <p className="text-xs text-muted-foreground text-center">
            Go talk to these people, then bring what you learn back into <span className="font-medium text-foreground">Score my evidence</span>.
          </p>
        </div>
      )}
    </div>
  );
};

export default PMFCustomerDiscovery;

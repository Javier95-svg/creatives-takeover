import React, { useEffect, useState } from 'react';
import { Users, MessagesSquare, ExternalLink, Copy, Check, Search, RefreshCw, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CreditCostNotice } from '@/components/CreditCostNotice';
import { useCustomerDiscovery, type PMFDiscovery } from '@/hooks/useCustomerDiscovery';

interface PMFCustomerDiscoveryProps {
  defaultProductName?: string | null;
  defaultTargetAudience?: string | null;
}

const buildMarkdown = (d: PMFDiscovery): string => {
  const lines: string[] = [`# Customer Discovery — ${d.productName || 'PMF Lab'}`];
  if (d.communities.length) {
    lines.push('', '## Communities to join');
    d.communities.forEach((c) => {
      lines.push(`- **${c.name}**${c.platform ? ` (${c.platform})` : ''}${c.url ? ` — ${c.url}` : ''}`);
      if (c.whyRelevant) lines.push(`  - Why: ${c.whyRelevant}`);
      if (c.howToEngage) lines.push(`  - How to engage: ${c.howToEngage}`);
    });
  }
  if (d.threads.length) {
    lines.push('', '## Live discussions to join');
    d.threads.forEach((t) => {
      lines.push(`- **${t.title}**${t.source ? ` (${t.source})` : ''}${t.url ? ` — ${t.url}` : ''}`);
      if (t.painQuote) lines.push(`  - Pain: "${t.painQuote}"`);
      if (t.outreachAngle) lines.push(`  - Angle: ${t.outreachAngle}`);
    });
  }
  return lines.join('\n');
};

const PMFCustomerDiscovery: React.FC<PMFCustomerDiscoveryProps> = ({
  defaultProductName,
  defaultTargetAudience,
}) => {
  const { discovery, isGenerating, generateDiscovery } = useCustomerDiscovery();
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState(false);

  // Prefill from a saved discovery, then from page context — only when still empty.
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

  const hasResults = Boolean(discovery && (discovery.communities.length > 0 || discovery.threads.length > 0));

  const handleGenerate = () => {
    void generateDiscovery({ product, audience, problem });
  };

  const handleCopy = async () => {
    if (!discovery) return;
    try {
      await navigator.clipboard.writeText(buildMarkdown(discovery));
      setCopied(true);
      toast.success('Discovery list copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text manually.');
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
            Before you can validate from real feedback, you need people to talk to. This finds the communities your
            customers live in and live discussions where they're already voicing this pain — so you know exactly where
            to go gather evidence.
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
            {isGenerating ? 'Searching…' : hasResults ? 'Regenerate list' : 'Find customers to talk to'}
          </Button>
          {hasResults && (
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy all'}
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {hasResults && discovery && (
        <div className="space-y-6">
          {/* Communities */}
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
                      {c.platform && (
                        <Badge variant="outline" className="text-caption shrink-0">{c.platform}</Badge>
                      )}
                    </div>
                    {c.whyRelevant && <p className="text-xs leading-relaxed text-muted-foreground">{c.whyRelevant}</p>}
                    {c.howToEngage && (
                      <p className="text-xs leading-relaxed text-foreground">
                        <span className="font-medium text-primary/80">How to show up: </span>{c.howToEngage}
                      </p>
                    )}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline min-w-0">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.url}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live discussions */}
          {discovery.threads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-info shrink-0" />
                <h3 className="text-sm font-semibold">Live discussions to join ({discovery.threads.length})</h3>
              </div>
              <div className="space-y-2.5">
                {discovery.threads.map((t, i) => (
                  <div key={`${t.title}-${i}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      {t.source && (
                        <Badge variant="outline" className="text-caption shrink-0 bg-info/10 text-info border-info/20">{t.source}</Badge>
                      )}
                    </div>
                    {t.snippet && <p className="text-xs leading-relaxed text-muted-foreground">{t.snippet}</p>}
                    {t.painQuote && (
                      <p className="text-xs italic leading-relaxed text-foreground border-l-2 border-warning/40 pl-3">
                        "{t.painQuote}"
                      </p>
                    )}
                    {t.outreachAngle && (
                      <p className="text-xs leading-relaxed text-foreground">
                        <span className="font-medium text-primary/80">Your angle: </span>{t.outreachAngle}
                      </p>
                    )}
                    {t.url && (
                      <a href={t.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline min-w-0">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t.url}</span>
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

import React, { useMemo, useState } from 'react';
import { Gauge, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SURVEY_QUESTION =
  'How would you feel if you could no longer use [product]?\n' +
  '  • Very disappointed\n' +
  '  • Somewhat disappointed\n' +
  '  • Not disappointed';

interface PMFSeanEllisTestProps {
  initialVery?: number;
  initialSomewhat?: number;
  initialNot?: number;
  onSave: (tally: { very: number; somewhat: number; not: number }) => Promise<boolean>;
}

const toCount = (value: string): number => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const PMFSeanEllisTest: React.FC<PMFSeanEllisTestProps> = ({
  initialVery = 0,
  initialSomewhat = 0,
  initialNot = 0,
  onSave,
}) => {
  const [very, setVery] = useState(String(initialVery || ''));
  const [somewhat, setSomewhat] = useState(String(initialSomewhat || ''));
  const [notDisappointed, setNotDisappointed] = useState(String(initialNot || ''));
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const v = toCount(very);
    const s = toCount(somewhat);
    const n = toCount(notDisappointed);
    const total = v + s + n;
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    return { v, s, n, total, pct };
  }, [very, somewhat, notDisappointed]);

  const hasResponses = counts.total > 0;
  const meetsPmf = counts.pct >= 40;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SURVEY_QUESTION);
      setCopied(true);
      toast.success('Survey question copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await onSave({ very: counts.v, somewhat: counts.s, not: counts.n });
    setIsSaving(false);
    if (!ok) return;
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
          Sean Ellis 40% test
        </p>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        The canonical PMF metric: a product is considered to have product-market fit when at least{' '}
        <span className="font-semibold text-foreground">40%</span> of users would be{' '}
        <span className="font-semibold text-foreground">very disappointed</span> without it. Run this survey,
        then paste your response tally below.
      </p>

      {/* Survey question template + copy */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground font-sans">{SURVEY_QUESTION}</pre>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1.5 text-xs">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      </div>

      {/* Tally inputs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="se-very" className="text-xs">Very disappointed</Label>
          <Input id="se-very" type="number" min={0} inputMode="numeric" value={very}
            onChange={(e) => setVery(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-somewhat" className="text-xs">Somewhat disappointed</Label>
          <Input id="se-somewhat" type="number" min={0} inputMode="numeric" value={somewhat}
            onChange={(e) => setSomewhat(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-not" className="text-xs">Not disappointed</Label>
          <Input id="se-not" type="number" min={0} inputMode="numeric" value={notDisappointed}
            onChange={(e) => setNotDisappointed(e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Result vs the 40% line */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">
            {hasResponses
              ? <>
                  <span className={cn('text-2xl font-semibold', meetsPmf ? 'text-success' : 'text-warning')}>
                    {counts.pct}%
                  </span>{' '}
                  would be very disappointed
                  <span className="text-muted-foreground"> · {counts.total} responses</span>
                </>
              : 'Enter your survey responses to see your PMF score.'}
          </p>
          {hasResponses && (
            <span className={cn('text-xs font-medium', meetsPmf ? 'text-success' : 'text-warning')}>
              {meetsPmf ? 'PMF benchmark met' : 'Below 40% benchmark'}
            </span>
          )}
        </div>

        <div className="relative pt-5">
          <span
            className="absolute top-0 -translate-x-1/2 text-caption font-medium text-muted-foreground"
            style={{ left: '40%' }}
          >
            40% PMF line
          </span>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full transition-all', meetsPmf ? 'bg-success' : 'bg-warning')}
              style={{ width: `${Math.min(100, counts.pct)}%` }}
            />
          </div>
          <div
            className="absolute bottom-0 h-3 w-0.5 bg-foreground/70"
            style={{ left: '40%' }}
            aria-hidden
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save survey results'}
      </Button>
    </div>
  );
};

export default PMFSeanEllisTest;

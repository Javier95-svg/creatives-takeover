import React, { useMemo, useState } from 'react';
import { Gauge, Copy, Check, Share2, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PMFSurvey, PMFSurveyAggregate } from '@/hooks/usePMFSurvey';

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
  // Hosted survey (real responses)
  survey: PMFSurvey | null;
  surveyAggregate: PMFSurveyAggregate;
  shareUrl: string | null;
  isCreatingSurvey: boolean;
  onCreateSurvey: () => void;
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
  survey,
  surveyAggregate,
  shareUrl,
  isCreatingSurvey,
  onCreateSurvey,
}) => {
  const [very, setVery] = useState(String(initialVery || ''));
  const [somewhat, setSomewhat] = useState(String(initialSomewhat || ''));
  const [notDisappointed, setNotDisappointed] = useState(String(initialNot || ''));
  const [isSaving, setIsSaving] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const manual = useMemo(() => {
    const v = toCount(very);
    const s = toCount(somewhat);
    const n = toCount(notDisappointed);
    const total = v + s + n;
    return { v, s, n, total, pct: total > 0 ? Math.round((v / total) * 100) : 0 };
  }, [very, somewhat, notDisappointed]);

  // Live survey responses take precedence over the manual tally.
  const live = surveyAggregate.total > 0;
  const pct = live ? surveyAggregate.veryPct : manual.pct;
  const total = live ? surveyAggregate.total : manual.total;
  const hasResponses = total > 0;
  const meetsPmf = pct >= 40;

  const copy = async (text: string, which: 'q' | 'l') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'q') { setCopiedQuestion(true); setTimeout(() => setCopiedQuestion(false), 2000); }
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
      toast.success('Copied.');
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ very: manual.v, somewhat: manual.s, not: manual.n });
    setIsSaving(false);
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
        The canonical PMF metric: you have product-market fit when at least{' '}
        <span className="font-semibold text-foreground">40%</span> of users would be{' '}
        <span className="font-semibold text-foreground">very disappointed</span> without your product.
      </p>

      {/* Hosted survey — collect real responses */}
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground">Collect real responses</p>
        </div>
        {survey && shareUrl ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Share this link with people who've used your product. Responses update your score automatically.
              </p>
              {surveyAggregate.total > 0 && (
                <Badge variant="outline" className="border-success/25 bg-success/10 text-success">
                  Verified hosted evidence
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => copy(shareUrl, 'l')}>
                {copiedLink ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs font-medium text-foreground">
              {surveyAggregate.total > 0
                ? `${surveyAggregate.total} response${surveyAggregate.total === 1 ? '' : 's'} collected`
                : 'No responses yet — share the link to get started.'}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Publish a 60-second survey and let real users answer. Verified responses replace the manual tally and feed your score.
            </p>
            <Button size="sm" onClick={onCreateSurvey} disabled={isCreatingSurvey}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isCreatingSurvey ? 'Creating…' : 'Create shareable survey'}
            </Button>
          </>
        )}
      </div>

      {/* Result vs the 40% line */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">
            {hasResponses
              ? <>
                  <span className={cn('text-2xl font-semibold', meetsPmf ? 'text-success' : 'text-warning')}>
                    {pct}%
                  </span>{' '}
                  would be very disappointed
                  <span className="text-muted-foreground">
                    {' · '}{total} {live ? 'real responses' : 'responses'}
                  </span>
                </>
              : 'Collect or enter responses to see your PMF score.'}
          </p>
          {hasResponses && (
            <span className={cn('text-xs font-medium', meetsPmf ? 'text-success' : 'text-warning')}>
              {meetsPmf ? 'PMF benchmark met' : 'Below 40% benchmark'}
            </span>
          )}
        </div>

        <div className="relative pt-5">
          <span className="absolute top-0 -translate-x-1/2 text-caption font-medium text-muted-foreground" style={{ left: '40%' }}>
            40% PMF line
          </span>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full transition-all', meetsPmf ? 'bg-success' : 'bg-warning')}
              style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="absolute bottom-0 h-3 w-0.5 bg-foreground/70" style={{ left: '40%' }} aria-hidden />
        </div>
      </div>

      {live ? (
        /* Verbatim feed from real responses */
        surveyAggregate.verbatims.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-info shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info">What they said</p>
            </div>
            <div className="space-y-2">
              {surveyAggregate.verbatims.slice(0, 5).map((v, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  {v.mainBenefit && <p className="text-xs text-foreground">{v.mainBenefit}</p>}
                  {v.feedback && <p className="text-xs italic text-muted-foreground">"{v.feedback}"</p>}
                  {v.role && <p className="text-caption text-muted-foreground">— {v.role}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Manual fallback: paste a tally from a survey you ran elsewhere */
        <div className="space-y-4">
          <Badge variant="outline" className="border-warning/25 bg-warning/10 text-warning">
            Manual fallback
          </Badge>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground font-sans">{SURVEY_QUESTION}</pre>
              <Button variant="ghost" size="sm" onClick={() => copy(SURVEY_QUESTION, 'q')} className="shrink-0">
                {copiedQuestion ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5 text-xs">{copiedQuestion ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>
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
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save survey results'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PMFSeanEllisTest;

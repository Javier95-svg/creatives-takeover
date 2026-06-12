import { ArrowRight, CheckCircle2, Mail, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WaitlistModeSelectProps {
  hasCompletedIcp: boolean;
  icpPersonaName?: string | null;
  onChooseIcpPowered: () => void;
  onChooseManual: () => void;
  onChooseLaunchKit: () => void;
  icpCtaLoading?: boolean;
  isGuest?: boolean;
}

export default function WaitlistModeSelect({
  hasCompletedIcp,
  icpPersonaName,
  onChooseIcpPowered,
  onChooseManual,
  onChooseLaunchKit,
  icpCtaLoading = false,
}: WaitlistModeSelectProps) {
  const handleManualClick = () => {
    onChooseManual();
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-2">

      <div className="grid gap-5 md:grid-cols-2">
        <Card
          className={cn(
            'group relative flex h-full flex-col justify-between overflow-hidden border-2 p-6 transition-all',
            hasCompletedIcp
              ? 'cursor-pointer border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background hover:border-primary hover:shadow-lg'
              : 'cursor-not-allowed border-dashed border-muted bg-muted/20 opacity-70',
          )}
          onClick={hasCompletedIcp && !icpCtaLoading ? onChooseIcpPowered : undefined}
        >
          {hasCompletedIcp && (
            <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-caption font-semibold uppercase tracking-wider text-primary-foreground">
              Recommended
            </span>
          )}

          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">ICP-Powered</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasCompletedIcp
                  ? `We’ll pre-fill your waitlist using your ICP${
                      icpPersonaName ? ` for ${icpPersonaName}` : ''
                    } — headline, pain points, value props, and CTA.`
                  : 'Build an ICP Draft first and unlock smart pre-fill for your waitlist.'}
              </p>
            </div>

            <ul className="space-y-2 pt-2 text-sm">
              {[
                'Headline & subheadline from your value prop',
                'Problem statement from your pain research',
                'Feature highlights from your core build',
                'Trust signals from your moat',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            className="mt-6 w-full justify-between"
            disabled={!hasCompletedIcp || icpCtaLoading}
            onClick={(event) => {
              event.stopPropagation();
              if (hasCompletedIcp) onChooseIcpPowered();
            }}
          >
            <span>{icpCtaLoading ? 'Loading your ICP…' : 'Use my ICP'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card
          className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden border-2 p-6 transition-all hover:border-foreground/40 hover:shadow-lg"
          onClick={handleManualClick}
        >
          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Manual Build</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse a curated landing page library, choose a founder-ready design, then edit directly on the canvas.
              </p>
            </div>

            <ul className="space-y-2 pt-2 text-sm">
              {[
                'Product name, tagline, description',
                'Up to 5 key feature highlights',
                'Custom CTA, colors, fonts, and visual assets',
                '8 product-type landing page designs',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="mt-6 w-full justify-between"
            onClick={(event) => {
              event.stopPropagation();
              handleManualClick();
            }}
          >
            <span>Browse templates</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <Card
        className="group mt-5 flex cursor-pointer flex-col gap-4 overflow-hidden border-2 p-6 transition-all hover:border-sky-500/60 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
        onClick={onChooseLaunchKit}
      >
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">Launch Kit</h3>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Copy only</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Skip the page builder. Generate your full copy package — A/B headlines, value props, CTAs, a 3-email pre-launch sequence, and referral hook — ready to deploy immediately.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {['3 headline variants (A/B/C)', '3 value prop bullets', 'CTA copy', '3-email sequence', 'Referral hook'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="w-full shrink-0 justify-between border-sky-500/40 text-sky-600 hover:border-sky-500 hover:bg-sky-500/5 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 sm:w-auto sm:min-w-[180px]"
          onClick={(event) => { event.stopPropagation(); onChooseLaunchKit(); }}
        >
          <span>Generate my kit</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}

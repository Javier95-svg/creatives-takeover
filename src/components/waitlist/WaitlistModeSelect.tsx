import { ArrowRight, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WaitlistModeSelectProps {
  hasCompletedIcp: boolean;
  icpPersonaName?: string | null;
  onChooseIcpPowered: () => void;
  onChooseManual: () => void;
  icpCtaLoading?: boolean;
}

export default function WaitlistModeSelect({
  hasCompletedIcp,
  icpPersonaName,
  onChooseIcpPowered,
  onChooseManual,
  icpCtaLoading = false,
}: WaitlistModeSelectProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-2">
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          Choose how to start
        </Badge>
        <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
          {hasCompletedIcp
            ? 'You built your ICP. Now let’s get your first users.'
            : 'Let’s build your pre-launch waitlist'}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Two paths to a live, founder-grade waitlist page in under 5 minutes.
        </p>
      </div>

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
            <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
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
          onClick={onChooseManual}
        >
          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Manual Build</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Guided form-based builder. Drop in your product name, tagline, features, and CTA — full creative control.
              </p>
            </div>

            <ul className="space-y-2 pt-2 text-sm">
              {[
                'Product name, tagline, description',
                'Up to 5 key feature highlights',
                'Custom CTA + visual assets',
                'Pre-Launch Product Showcase template',
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
              onChooseManual();
            }}
          >
            <span>Start from scratch</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

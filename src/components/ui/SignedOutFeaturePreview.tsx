import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SignedOutFeaturePreviewProps {
  featureName: string;
  description: string;
  previewItems?: string[];
  showPricingCta?: boolean;
}

export function SignedOutFeaturePreview({
  featureName,
  description,
  previewItems = [],
  showPricingCta = false,
}: SignedOutFeaturePreviewProps) {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-[2rem] border border-border/60 bg-background/85 p-6 shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Lock className="h-3.5 w-3.5" />
            Preview Mode
          </div>

          <h2 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
            {featureName}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>

          {previewItems.length > 0 && (
            <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-3">
              {previewItems.slice(0, 3).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to={`/signup?return=${encodeURIComponent(returnPath)}`}>
                Sign up to unlock
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {showPricingCta && (
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">See Pricing</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

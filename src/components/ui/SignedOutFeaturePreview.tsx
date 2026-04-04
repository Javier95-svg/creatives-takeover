import { ArrowRight, Crown, Lock, Sparkles } from 'lucide-react';
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
    <div className="z-20 w-full max-w-md px-4 sm:max-w-2xl">
      <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Lock className="h-3.5 w-3.5" />
            Preview Mode
          </div>

          <h2 className="text-xl font-bold text-foreground sm:text-2xl mb-2">
            Sign in to unlock
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-xs sm:max-w-md">
            {description}
          </p>

          {previewItems.length > 0 && (
            <div className="mb-6 grid w-full gap-3 text-left sm:grid-cols-3">
              {previewItems.slice(0, 3).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
            >
              <Link to={`/signup?return=${encodeURIComponent(returnPath)}`}>
                Sign up
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {showPricingCta && (
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/pricing">
                  <Crown className="h-4 w-4 mr-2" />
                  See Pricing
                </Link>
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Already have an account?
            <Link to={`/login?return=${encodeURIComponent(returnPath)}`} className="ml-1 font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

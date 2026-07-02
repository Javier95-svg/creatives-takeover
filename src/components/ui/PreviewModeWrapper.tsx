import { ReactNode, useEffect, useRef } from 'react';
import { Lock, ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { PREVIEW_MODE_CONTENT_BLUR, PREVIEW_MODE_OVERLAY_BACKGROUND } from '@/components/ui/previewOverlayStyles';
import { captureEvent } from '@/lib/analytics';

interface PreviewModeWrapperProps {
  children: ReactNode;
  featureName: string;
  description: string;
  showPricingCta?: boolean;
  isLoading?: boolean;
  /** Overrides the default "Sign in to unlock" headline (e.g. "Your results are ready"). */
  headline?: string;
  /** Overrides the default "Sign up" primary CTA label. */
  ctaLabel?: string;
  /** Fired when the primary signup CTA is clicked — used for funnel analytics. */
  onCtaClick?: () => void;
  signupSource?: string;
  signupReturnPath?: string;
  /** When set, fires free_tool_signup_gate_shown once on mount so gate impressions are measurable. */
  analyticsTool?: string;
}

export function PreviewModeWrapper({
  children,
  featureName,
  description,
  showPricingCta = false,
  isLoading = false,
  headline = "Sign in to unlock",
  ctaLabel = "Sign up",
  onCtaClick,
  signupSource,
  signupReturnPath,
  analyticsTool,
}: PreviewModeWrapperProps) {
  const location = useLocation();
  const hasTrackedGate = useRef(false);

  useEffect(() => {
    if (!analyticsTool || hasTrackedGate.current) return;
    hasTrackedGate.current = true;
    captureEvent('free_tool_signup_gate_shown', { tool: analyticsTool });
  }, [analyticsTool]);
  const returnPath = signupReturnPath ?? `${location.pathname}${location.search}`;
  const signupHref = `/signup?${
    new URLSearchParams({
      ...(signupSource ? { source: signupSource } : {}),
      return: returnPath,
    }).toString()
  }`;
  const loginHref = `/login?${new URLSearchParams({ return: returnPath }).toString()}`;

  return (
    <div className="relative min-h-[600px] w-full">
      {/* Blurred Content Background */}
      <div 
        className="w-full select-none pointer-events-none"
        aria-hidden="true"
        style={{ filter: PREVIEW_MODE_CONTENT_BLUR, willChange: 'filter' }}
      >
        {children}
      </div>

      {/* Gradient Overlay with Radial Vignette */}
      <div 
        className="absolute inset-0 flex items-center justify-center rounded-xl"
        style={{
          background: PREVIEW_MODE_OVERLAY_BACKGROUND,
        }}
      >
        {/* Centered CTA Box */}
        <div className="z-20 w-full max-w-md px-4">
          <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="flex flex-col items-center text-center">
              {/* Lock Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Lock className="h-3.5 w-3.5" />
                Preview Mode
              </div>

              {/* Headline */}
              <h2 className="text-xl font-bold text-foreground sm:text-2xl mb-2">
                {headline}
              </h2>

              {/* Value Prop - Single Line */}
              <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-xs">
                {description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
                >
                  <Link to={signupHref} onClick={onCtaClick}>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {showPricingCta && (
                  <Button 
                    asChild 
                    variant="outline" 
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Link to="/pricing">
                      <Crown className="h-4 w-4 mr-2" />
                      See Pricing
                    </Link>
                  </Button>
                )}
              </div>

              {/* Helper Text */}
              <p className="text-xs text-muted-foreground mt-4">
                Already have an account? 
                <Link to={loginHref} className="ml-1 font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

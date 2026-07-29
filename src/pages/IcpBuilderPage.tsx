import { lazy, Suspense, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import Navigation from "@/components/Navigation";
import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { readIcpBuilderSession } from "@/lib/icpBuilderSession";
import { useExitIntent } from "@/hooks/useExitIntent";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import {
  trackActivationCompleted,
  trackICPBuilderOpened,
  trackLandingViewed,
  trackToolOpened,
  type IcpBuilderOpenedSource,
} from "@/lib/analytics";
import { ICP_SEED_STORAGE_KEY } from "@/lib/icpSeed";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";
import { useAuth } from "@/contexts/AuthContext";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

function getIcpBuilderOpenedSource(
  params: URLSearchParams,
  seedPrefilled: boolean,
): IcpBuilderOpenedSource {
  const source = params.get("source");
  if (source === "dashboard" || source === "onboarding" || source === "direct" || source === "seed_redirect") {
    return source;
  }

  if (seedPrefilled || params.has("seed")) {
    return "seed_redirect";
  }

  if (params.has("intent")) {
    return "onboarding";
  }

  try {
    const referrerPath = document.referrer ? new URL(document.referrer).pathname : "";
    if (referrerPath.startsWith("/dashboard")) {
      return "dashboard";
    }
  } catch {
    return "direct";
  }

  return "direct";
}

export default function ICPBuilderPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const hasTracked = useRef(false);
  const { showExitIntent, closeExitIntent } = useExitIntent();

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackLandingViewed({ page: '/icp-builder' });

    const params = new URLSearchParams(window.location.search);
    const seed = sessionStorage.getItem(ICP_SEED_STORAGE_KEY);
    const seedPrefilled = seed !== null;
    trackICPBuilderOpened({
      source: getIcpBuilderOpenedSource(params, seedPrefilled),
      seed_prefilled: seedPrefilled,
    });
    trackToolOpened('icp_builder');

    // The ICP route previously emitted only icp_builder_opened, so it was invisible to the
    // activation funnel and no single funnel could span both hero CTA destinations.
    // Fired ungated (not waiting on auth) to match trackICPBuilderOpened above — a complete
    // denominator matters more here than a perfectly resolved is_authenticated flag.
    trackActivationFunnelEvent('activation_entry_opened', {
      entry_id: 'icp_builder',
      tool: 'icp_builder',
      source: 'icp_builder',
      step: 'opened',
      entry_page: '/icp-builder',
      is_authenticated: isAuthenticated,
    });

    if (seed?.trim()) {
      trackActivationCompleted({ trigger: 'icp_seed_prefilled', artifact: 'icp_seed_prefilled' });
    }
  }, [isAuthenticated]);

  const handleReturnToPlatform = () => {
    // Same reasoning as the lead banner above: only real content counts as
    // progress worth warning about, not the auto-advanced screen position.
    const session = readIcpBuilderSession();
    const hasProgress = Boolean(
      session &&
        (session.fastDescription.trim() ||
          session.guided.seed?.trim() ||
          session.draftPreview),
    );

    if (hasProgress) {
      const confirmed = window.confirm("Your ICP Builder progress is saved. Leave the builder and return to the platform?");
      if (!confirmed) {
        return;
      }
    }

    navigate("/");
  };

  const icpFaqs = [
    {
      question: "What is an ideal customer profile for a startup?",
      answer: "An ideal customer profile is the specific type of customer most likely to need your product, feel the pain strongly, and adopt early. It is more precise than a broad persona or market category.",
    },
    {
      question: "Why do founders need an ICP before building?",
      answer: "Without a clear ICP, founders build for everyone and reach no one. Defining your ideal customer first sharpens your MVP scope, your messaging, and your first sales conversations.",
    },
    {
      question: "How long does it take to build an ICP draft?",
      answer: "The ICP Builder guides you through a structured flow in around 10–15 minutes. You can refine the output as you learn more from real customer conversations.",
    },
  ];

  const structuredData = [
    createSoftwareApplicationSchema({
      name: "Creatives Takeover ICP Builder",
      description:
        "Free ideal customer profile builder for founders who need customer clarity before validation, waitlist creation, MVP planning, or go-to-market work.",
      url: "/icp-builder",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Ideal customer profile generation",
        "Customer pain point synthesis",
        "Startup positioning guidance",
        "Founder validation next steps",
      ],
      price: "0",
    }),
    createFAQSchema(icpFaqs),
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "ICP Builder", url: "/icp-builder" },
    ]),
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <SEO
        title="Build your ICP Draft | Creatives Takeover"
        description="Build a founder-specific ICP Draft in one guided flow and turn it into a usable customer document."
        url="/icp-builder"
        structuredData={structuredData}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.98))]" />
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.8) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.02))",
          }}
        />
        <div
          className="absolute -right-48 -top-40 h-[55rem] w-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.35), transparent 55%)",
            animationDuration: "28s",
          }}
        />
        <div
          className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle at center, rgba(249, 115, 22, 0.12), transparent 62%)",
          }}
        />
      </div>

      <Navigation />

      <div className="fixed left-3 top-[92px] z-40 sm:left-6 sm:top-[100px] md:top-[108px] lg:left-8">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-full border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl hover:bg-background"
          onClick={handleReturnToPlatform}
        >
          ← Platform
        </Button>
      </div>

      <main className="relative z-10">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-transparent px-4 pt-28 md:pt-32">
              <div className="flex items-center gap-3 rounded-5xl border border-border/60 bg-white/80 px-6 py-5 text-muted-foreground shadow-sm backdrop-blur dark:bg-slate-950/70">
                <Loader2 className="h-5 w-5 animate-spin text-accent-teal" />
                Loading ICP Builder...
              </div>
            </div>
          }
        >
          <ICPBuilder />
        </Suspense>
        <aside aria-label="ICP learning resource" className="mx-auto max-w-5xl px-4 pb-12 text-center text-sm text-muted-foreground">
          Need a clearer starting point?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            to="/answers/how-to-define-icp-for-startup"
          >
            Learn how to define an ICP for your startup
          </Link>
          .
        </aside>
      </main>

      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </div>
  );
}

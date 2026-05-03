import { FormEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { readIcpBuilderSession } from "@/lib/icpBuilderSession";
import {
  captureEvent,
  trackActivationCompleted,
  trackICPBuilderOpened,
  trackLandingViewed,
  type IcpBuilderOpenedSource,
} from "@/lib/analytics";
import { ICP_SEED_STORAGE_KEY } from "@/lib/icpSeed";

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
  const hasTracked = useRef(false);
  const [showLeadBanner, setShowLeadBanner] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('ct_lead_email')) {
      setLeadCaptured(true);
      return;
    }

    const timer = setTimeout(() => setShowLeadBanner(true), 20000);
    return () => clearTimeout(timer);
  }, []);

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

    if (seed?.trim()) {
      trackActivationCompleted({ artifact: 'icp_seed_prefilled' });
    }
  }, []);

  const handleReturnToPlatform = () => {
    const session = readIcpBuilderSession();
    const hasProgress = Boolean(
      session &&
        (session.currentScreen !== "mode_select" ||
          session.fastDescription.trim() ||
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

  const handleLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = leadEmail.trim();
    if (!email || !email.includes("@")) {
      return;
    }

    localStorage.setItem('ct_lead_email', email);
    captureEvent('icp_builder_lead_captured', { email, source: 'save_progress_banner' });
    setLeadCaptured(true);
    setShowLeadBanner(false);
  };

  const handleDismissLeadBanner = () => {
    setShowLeadBanner(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <SEO
        title="Build your ICP Draft | Creatives Takeover"
        description="Build a founder-specific ICP Draft in one guided flow and turn it into a usable customer document."
        url="/icp-builder"
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
              <div className="flex items-center gap-3 rounded-[2rem] border border-border/60 bg-white/80 px-6 py-5 text-muted-foreground shadow-sm backdrop-blur dark:bg-slate-950/70">
                <Loader2 className="h-5 w-5 animate-spin text-[#32b8c6]" />
                Loading ICP Builder...
              </div>
            </div>
          }
        >
          <ICPBuilder />
        </Suspense>
      </main>

      {showLeadBanner && !leadCaptured ? (
        <div className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-4 text-slate-950 shadow-xl">
          <button
            type="button"
            aria-label="Dismiss save progress banner"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={handleDismissLeadBanner}
          >
            ×
          </button>

          <form className="space-y-3 pr-6" onSubmit={handleLeadSubmit}>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-950">Save your ICP progress</h2>
              <p className="text-sm leading-5 text-slate-600">
                Drop your email and we'll send you a link to continue anytime.
              </p>
            </div>

            <input
              type="email"
              value={leadEmail}
              onChange={(event) => setLeadEmail(event.target.value)}
              placeholder="your@email.com"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#32b8c6] focus:ring-2 focus:ring-[#32b8c6]/20"
            />

            <Button type="submit" className="h-10 w-full rounded-lg text-sm font-semibold">
              Save my progress
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

import { FormEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { readIcpBuilderSession } from "@/lib/icpBuilderSession";
import { useExitIntent } from "@/hooks/useExitIntent";
import { ExitIntentModal } from "@/components/ExitIntentModal";
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
  const { showExitIntent, closeExitIntent } = useExitIntent();
  const [showLeadBanner, setShowLeadBanner] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadSubmitState, setLeadSubmitState] = useState<"idle" | "submitted">("idle");

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
      trackActivationCompleted({ trigger: 'icp_seed_prefilled', artifact: 'icp_seed_prefilled' });
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
    setLeadSubmitState("submitted");
    window.setTimeout(() => setShowLeadBanner(false), 2200);
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

      {showLeadBanner && (!leadCaptured || leadSubmitState === "submitted") ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-[24rem] overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/90 text-slate-950 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white sm:left-auto sm:right-5 sm:mx-0">
          <div className="pointer-events-none absolute -right-16 -top-20 h-36 w-36 rounded-full bg-[#32b8c6]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />

          <button
            type="button"
            aria-label="Dismiss save progress banner"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32b8c6]/50 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white dark:hover:text-slate-950"
            onClick={handleDismissLeadBanner}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative p-5 pr-14">
            {leadSubmitState === "submitted" ? (
              <div className="flex items-start gap-3 pr-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Resume link saved</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    Your ICP Draft progress is connected to this email.
                  </p>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleLeadSubmit}>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#32b8c6]/20 bg-[#32b8c6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#168996]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    ICP Draft checkpoint
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                      Save your ICP Draft progress
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      Send yourself a resume link so you can pick up this customer profile later.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Draft auto-saved in this browser</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(event) => setLeadEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }}
                      placeholder="you@company.com"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#32b8c6] focus:ring-4 focus:ring-[#32b8c6]/15 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                    />
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold shadow-[0_12px_28px_-18px_rgba(50,184,198,0.7)]">
                  Send resume link
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </div>
  );
}

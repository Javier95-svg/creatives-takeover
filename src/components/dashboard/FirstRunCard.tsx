import { useState, useEffect } from "react";
import { ArrowRight, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics";

const NUDGE_DISMISS_KEY = "ct_nudge_v1";

const FirstRunCard = () => {
  const { user } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [show24hNudge, setShow24hNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;

      setOnboardingCompleted(data.onboarding_completed ?? false);

      const hoursSinceSignup =
        (Date.now() - new Date(data.created_at).getTime()) / 3_600_000;
      const nudgeSeen = localStorage.getItem(NUDGE_DISMISS_KEY) === "true";
      if (hoursSinceSignup >= 24 && !nudgeSeen && !data.onboarding_completed) {
        setShow24hNudge(true);
      }
    };

    void fetchProfile();
  }, [user]);

  const handleDismissNudge = () => {
    localStorage.setItem(NUDGE_DISMISS_KEY, "true");
    setNudgeDismissed(true);
    captureEvent("dashboard_nudge_dismissed", { nudge: "24h_no_tool" });
  };

  if (!user) return null;

  return (
    <>
      {onboardingCompleted === false && (
        <div className="mb-6 rounded-2xl border border-accent-teal/30 bg-accent-teal/10 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-teal/15 text-accent-teal">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Get your first result in 60 seconds
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Run the ICP Builder to define your ideal customer — it takes under a minute.
                </p>
              </div>
            </div>
            <Link
              to="/icp-builder?mode=fast"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-teal px-4 py-2 text-sm font-semibold text-white hover:bg-accent-teal-hover transition-colors"
              onClick={() => captureEvent("first_run_card_clicked", { card: "onboarding" })}
            >
              Run ICP Builder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {show24hNudge && !nudgeDismissed && onboardingCompleted === false && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t tried a tool yet.{" "}
            <Link
              to="/icp-builder?mode=fast"
              className="font-semibold text-foreground underline underline-offset-2 hover:text-accent-teal transition-colors"
              onClick={() => captureEvent("first_run_card_clicked", { card: "24h_nudge" })}
            >
              Most founders start here →
            </Link>
          </p>
          <button
            type="button"
            onClick={handleDismissNudge}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
};

export default FirstRunCard;

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowRight, Target, Zap, BarChart2, Loader2, CheckCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sendRetentionEmail } from "@/lib/retentionSystem";
import { trackExitIntentModalShown, captureEvent } from "@/lib/analytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefits = [
  { icon: BarChart2, text: "Niche viability score out of 100" },
  { icon: Target,   text: "Pain points & positioning mapped by AI" },
  { icon: Zap,      text: "Takes under 5 minutes" },
];

export const ExitIntentModal = ({ isOpen, onClose }: ExitIntentModalProps) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { set: setAttribution } = useCTAAttribution();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [email, setEmail] = useState(user?.email ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Query onboarding state once when modal opens for authenticated users
  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setOnboardingCompleted(data?.onboarding_completed ?? null));
  }, [isOpen, isAuthenticated, user]);

  // Sync email when user changes
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  // Reset sent/sending when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSent(false);
      setSending(false);
      setOnboardingCompleted(null);
    }
  }, [isOpen]);

  // Track modal open
  useEffect(() => {
    if (!isOpen) return;
    trackExitIntentModalShown({
      user_state: isAuthenticated ? 'authenticated' : 'anonymous',
      page: location.pathname,
    });
  }, [isOpen, isAuthenticated, location.pathname]);

  // Authenticated + still querying: don't flash the wrong modal
  if (isAuthenticated && onboardingCompleted === null) return null;

  // Authenticated + onboarding already done: nothing to recover
  if (isAuthenticated && onboardingCompleted === true) return null;

  // Authenticated + onboarding NOT completed → reminder path
  if (isAuthenticated && onboardingCompleted !== true) {
    const handleSendReminder = async () => {
      if (!user || !email) return;
      setSending(true);
      try {
        await sendRetentionEmail({
          userId: user.id,
          email,
          sequence: "exit_intent_reminder",
          ctaUrl: "/icp-builder",
          ctaLabel: "Build your ICP",
          contextHeadline: "You were almost there",
          contextBody:
            "Your ICP draft takes 5 minutes and gives you clarity on exactly who to target first.",
        });
      } catch {
        // fails silently — no email template yet
      }
      setSent(true);
      setSending(false);
      setTimeout(onClose, 1500);
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-md p-0 overflow-hidden border border-border/30 bg-background shadow-2xl z-[100]">
          <DialogTitle className="sr-only">Before you go — resume your ICP</DialogTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />
            <div className="relative z-10 p-7">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {sent ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="font-semibold text-foreground">Reminder sent ✓</p>
                  <p className="text-sm text-muted-foreground">Check your inbox when you're ready.</p>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-5">
                    <span className="text-xs font-semibold tracking-widest uppercase text-primary">Quick reminder</span>
                  </div>

                  <h2 className="font-space-grotesk text-2xl font-bold text-foreground leading-tight mb-3">
                    Before you go — your ICP draft takes 5 minutes.
                  </h2>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    We can send you a quick reminder when you're ready.
                  </p>

                  <div className="space-y-3 mb-6">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    <Button
                      size="lg"
                      className="w-full font-semibold"
                      onClick={() => {
                        captureEvent('cta_clicked', { cta_name: 'exit_intent_send_reminder', page: location.pathname });
                        void handleSendReminder();
                      }}
                      disabled={sending || !email}
                    >
                      {sending ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send me a reminder"
                      )}
                    </Button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={onClose}
                      className="min-h-[44px] px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation rounded-lg hover:bg-muted/50"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Unauthenticated path (original)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md p-0 overflow-hidden border border-border/30 bg-background shadow-2xl z-[100]">
        <DialogTitle className="sr-only">Complete your ICP — it's free</DialogTitle>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />

          <div className="relative z-10 p-7">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Stage pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-5">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Stage 1 · Free</span>
            </div>

            {/* Headline */}
            <h2 className="font-space-grotesk text-2xl font-bold text-foreground leading-tight mb-3">
              Build your ICP before you go.
            </h2>

            {/* Subline */}
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              Know exactly who your customer is — for free. No credit card, no fluff. Just clarity.
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-7">
              {benefits.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mb-3"
              asChild
            >
              <Link
                to="/icp-builder"
                onClick={() => {
                  captureEvent('cta_clicked', { cta_name: 'exit_intent_start_icp', page: location.pathname });
                  setAttribution('exit_intent_icp', location.pathname);
                  onClose();
                }}
              >
                Start ICP Builder — It's Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>

            {/* Dismiss */}
            <div className="text-center">
              <button
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation rounded-lg hover:bg-muted/50"
              >
                Maybe later
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Free for all accounts · No credit card required
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

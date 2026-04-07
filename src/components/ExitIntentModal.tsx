import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Target, Zap, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

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
              <Link to="/icp-builder" onClick={onClose}>
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

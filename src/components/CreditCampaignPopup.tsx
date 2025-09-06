import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Gift, Clock, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface CreditCampaignPopupProps {
  trigger: 'hover' | 'scroll' | 'time';
  delay?: number;
  onClose?: () => void;
}

export const CreditCampaignPopup = ({ trigger, delay = 3000, onClose }: CreditCampaignPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't show for authenticated users
    if (isAuthenticated) return;

    // Check if user has already seen this popup in this session
    const sessionKey = `credit-popup-${trigger}-seen`;
    const hasSeenPopup = sessionStorage.getItem(sessionKey);
    if (hasSeenPopup || hasShown) return;

    let timeoutId: NodeJS.Timeout;

    const showPopup = () => {
      if (!hasShown) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    if (trigger === 'time') {
      timeoutId = setTimeout(showPopup, delay);
    } else if (trigger === 'scroll') {
      const handleScroll = () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > 30) {
          showPopup();
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [trigger, delay, isAuthenticated, hasShown]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (isAuthenticated || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-background/95 backdrop-blur-xl">
        <div className="relative">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 animate-pulse" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl animate-float" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
          
          <div className="relative z-10 p-6">
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 mb-4 animate-fade-in">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">🎁 LIMITED TIME OFFER</span>
            </div>

            {/* Headline */}
            <h3 className="text-xl font-bold mb-3 animate-slide-up">
              <span className="gradient-text">Get FREE Report</span>
              <br />
              <span className="text-foreground">+ Up to 7 Credits!</span>
            </h3>

            {/* Subheadline */}
            <p className="text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Complete our 5-minute survey and receive a comprehensive business plan plus bonus credits.
            </p>

            {/* Credit Breakdown */}
            <div className="grid grid-cols-3 gap-2 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-center p-2 glass-card">
                <div className="text-primary font-bold text-lg">2</div>
                <div className="text-xs text-muted-foreground">Base</div>
              </div>
              <div className="text-center p-2 glass-card">
                <div className="text-secondary font-bold text-lg">+3</div>
                <div className="text-xs text-muted-foreground">Email</div>
              </div>
              <div className="text-center p-2 glass-card">
                <div className="text-accent font-bold text-lg">+2</div>
                <div className="text-xs text-muted-foreground">Bonus</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span>15-page business analysis report</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span>AI market research & validation</span>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex gap-4 justify-center mb-4 text-xs text-muted-foreground animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" />
                <span>500+ earned credits</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>5 min survey</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <Button size="sm" className="w-full glass bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic relative overflow-hidden group" asChild>
                <Link to="/dream2plan" onClick={handleClose}>
                  <span className="relative z-10">Claim FREE Report + Credits</span>
                  <ArrowRight className="ml-2 w-4 h-4 relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                </Link>
              </Button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-3">
              No credit card required • Survey takes 5 minutes
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
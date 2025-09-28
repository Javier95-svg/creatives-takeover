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
    console.log('CreditCampaignPopup check:', { isAuthenticated, trigger, delay });
    if (isAuthenticated) return;

    // Check if user has already seen this popup in this session
    const sessionKey = `credit-popup-${trigger}-seen`;
    const hasSeenPopup = sessionStorage.getItem(sessionKey);
    console.log('CreditCampaignPopup session check:', { sessionKey, hasSeenPopup, hasShown });
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
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-lg p-0 overflow-hidden border border-border/20 bg-background/98 backdrop-blur-2xl shadow-2xl z-[80]">
        <div className="relative">
          {/* Enhanced Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-secondary/6 to-accent/8" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/25 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/25 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute center w-16 h-16 bg-gradient-to-r from-accent/20 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          <div className="relative z-10 p-4 sm:p-6">
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/15 to-orange-500/15 border border-red-500/30 rounded-full shadow-lg mb-4 animate-fade-in">
              <Clock className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-sm font-bold text-red-600">⚡ ENDING TODAY - Act Fast!</span>
            </div>

            {/* Headline */}
            <h3 className="text-xl font-bold mb-3 animate-slide-up">
              <span className="gradient-text">🔥 Only 50 Left!</span>
              <br />
              <span className="text-foreground">FREE Report + 7 Credits</span>
            </h3>

            {/* Subheadline */}
            <p className="text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              ⏰ <span className="font-bold text-red-600">Hurry!</span> We're limiting this to the first 500 users only. <span className="font-semibold">450 already claimed</span> - don't miss out!
            </p>

            {/* Credit Breakdown */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-center p-1.5 sm:p-2 glass-card">
                <div className="text-primary font-bold text-base sm:text-lg">2</div>
                <div className="text-xs text-muted-foreground">Base</div>
              </div>
              <div className="text-center p-1.5 sm:p-2 glass-card">
                <div className="text-secondary font-bold text-base sm:text-lg">+3</div>
                <div className="text-xs text-muted-foreground">Email</div>
              </div>
              <div className="text-center p-1.5 sm:p-2 glass-card">
                <div className="text-accent font-bold text-base sm:text-lg">+2</div>
                <div className="text-xs text-muted-foreground">Bonus</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Strategic business analysis report</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span>AI market research & validation</span>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mb-4 text-xs text-muted-foreground animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-primary" />
                <span>Growing community</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>5 min survey</span>
              </div>
            </div>

            {/* Enhanced CTA Button */}
            <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <Button size="lg" className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group" asChild>
                <Link to="/dream2plan" onClick={handleClose}>
                  <span className="relative z-10 font-semibold">Claim FREE Report + Credits</span>
                  <ArrowRight className="ml-2 w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
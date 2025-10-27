import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ScrollTriggeredCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't show for authenticated users
    console.log('ScrollTriggeredCTA check:', { isAuthenticated });
    if (isAuthenticated) return;

    // Check if user has already dismissed the CTA in this session
    const hasSeenCTA = sessionStorage.getItem('scroll-cta-dismissed');
    console.log('ScrollTriggeredCTA session check:', { hasSeenCTA });
    if (hasSeenCTA) return;

    const handleScroll = () => {
      // Much less aggressive - trigger at 90% scroll
      const scrollPosition = window.scrollY;
      const triggerPoint = window.innerHeight * 0.9;
      
      if (scrollPosition > triggerPoint && !isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('scroll-cta-dismissed', 'true');
  };

  // Don't show if user is authenticated or dismissed
  if (isAuthenticated || !isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-up">
      <div className="glass-card max-w-md mx-4 p-5 border border-primary/20 shadow-2xl bg-background/95 backdrop-blur-xl rounded-xl">
        <div className="relative">
          {/* Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 text-muted-foreground hover:text-foreground transition-colors bg-background rounded-full p-1 border border-border"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Enhanced Content */}
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-primary/15 to-secondary/15 rounded-xl border border-primary/20">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground mb-1">Get FREE Report + Credits!</h3>
              <p className="text-sm text-muted-foreground">5-min survey = Free plan + up to 7 credits</p>
            </div>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className="flex gap-3">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group" asChild>
              <Link to="/bizmap-ai">
                <span className="relative z-10 font-semibold">Claim Credits</span>
                <ArrowRight className="ml-1 w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 shadow-md transition-all duration-300" asChild>
              <Link to="/bizmap-ai">
                <span className="font-semibold">Preview</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
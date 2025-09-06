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
    if (isAuthenticated) return;

    // Check if user has already dismissed the CTA in this session
    const hasSeenCTA = sessionStorage.getItem('scroll-cta-dismissed');
    if (hasSeenCTA) return;

    const handleScroll = () => {
      // Show CTA after scrolling past 50% of viewport height
      const scrollPosition = window.scrollY;
      const triggerPoint = window.innerHeight * 0.5;
      
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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="glass-card max-w-md mx-4 p-4 border border-border shadow-2xl">
        <div className="relative">
          {/* Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 text-muted-foreground hover:text-foreground transition-colors bg-background rounded-full p-1 border border-border"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Get FREE Report + Credits!</h3>
              <p className="text-sm text-muted-foreground">5-min survey = Free plan + up to 7 credits</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden group" asChild>
              <Link to="/dream2plan">
                <span className="relative z-10">Claim Credits</span>
                <ArrowRight className="ml-1 w-3 h-3 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1 hover:bg-primary/10" asChild>
              <Link to="/dream2plan">
                Preview
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
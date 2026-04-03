import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling 300px
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollPosition > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden safe-area-inset">
      <div className="bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl">
        <div className="container mx-auto px-4 py-3">
          <Button
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold shadow-lg shadow-primary/20"
            asChild
          >
            {/* FIX(retention): homepage — the sticky mobile CTA now routes directly into ICP quickstart instead of a generic signup step. */}
            <Link to="/icp-builder">
              <span>Run ICP Analysis</span>
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyMobileCTA;


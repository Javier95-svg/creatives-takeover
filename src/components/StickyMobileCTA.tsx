import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { captureEvent } from "@/lib/analytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";

const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const isHomepage = location.pathname === "/";
  const { set: setAttribution } = useCTAAttribution();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      const visibilityThreshold = isHomepage ? 900 : 300;
      setIsVisible(scrollPosition > visibilityThreshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomepage]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 lg:hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-md rounded-[28px] border border-border/80 bg-background/88 backdrop-blur-xl shadow-[0_24px_42px_-24px_rgba(15,23,42,0.35)]">
        <div className="px-3 py-3 sm:px-4">
          <Button
            size="lg"
            className="w-full min-h-[52px] rounded-[22px] bg-primary hover:bg-primary/90 text-primary-foreground text-[15px] font-semibold shadow-[0_18px_32px_-20px_rgba(37,99,235,0.55)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            asChild
          >
            {/* FIX(retention): homepage — the sticky mobile CTA now routes directly into ICP quickstart instead of a generic signup step. */}
            <Link
              to="/icp-builder"
              onClick={() => {
                captureEvent('cta_clicked', { cta_name: 'sticky_mobile_cta', page: location.pathname });
                setAttribution('sticky_mobile_icp', location.pathname);
              }}
            >
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


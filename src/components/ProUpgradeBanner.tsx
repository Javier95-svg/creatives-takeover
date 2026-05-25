import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ProUpgradeBanner = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    const showBanner = !loading && isAuthenticated && location.pathname === '/';

    useEffect(() => {
        if (showBanner) {
            document.documentElement.style.setProperty('--banner-height', '36px');
        } else {
            document.documentElement.style.removeProperty('--banner-height');
        }

        return () => {
            document.documentElement.style.removeProperty('--banner-height');
        };
    }, [showBanner]);

    if (!showBanner) return null;

    return (
        <div className="bg-background/60 backdrop-blur-md text-foreground border-b border-border/40 sticky top-0 z-[55]">
            <div className="container mx-auto px-4 h-9 flex items-center justify-center gap-2 text-sm font-medium">
                <span>Help us build a better product with your feedback</span>
                <a
                    href="https://tally.so/r/rjJGao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold underline underline-offset-4 group ml-1"
                >
                    Take Quiz
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </a>
            </div>
        </div>
    );
};

export default ProUpgradeBanner;

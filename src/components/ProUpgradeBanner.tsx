import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ProUpgradeBanner = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    const hideForAuthRoutes =
        location.pathname === '/login' ||
        location.pathname === '/signup' ||
        location.pathname === '/auth' ||
        location.pathname === '/dashboard' ||
        location.pathname.startsWith('/dashboard/') ||
        location.pathname === '/icp-builder' ||
        location.pathname.startsWith('/bizmap-ai/icp-builder') ||
        location.pathname.startsWith('/mvp-builder');
    const showBanner = !loading && isAuthenticated && !hideForAuthRoutes;

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
        <div className="bg-background/60 backdrop-blur-md text-foreground border-b border-border/40 sticky top-0 z-[100]">
            <div className="container mx-auto px-4 h-9 flex items-center justify-center gap-2 text-sm font-medium">
                <span>Give us your feedback and get a free Pro upgrade</span>
                <a
                    href="https://calendly.com/javier-creatives-takeover/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold underline underline-offset-4 group ml-1"
                >
                    Book Here
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </a>
            </div>
        </div>
    );
};

export default ProUpgradeBanner;

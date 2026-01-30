
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ProUpgradeBanner = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    const hideForAuthRoutes = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/auth';
    const showBanner = !loading && !hideForAuthRoutes;

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
        <div className="bg-primary text-primary-foreground border-b border-primary/20 sticky top-0 z-[100]">
            <div className="container mx-auto px-4 h-9 flex items-center justify-center gap-2 text-sm font-medium">
                {isAuthenticated ? (
                    <>
                        <span>Give us your feedback and get a free Pro upgrade</span>
                        <a
                            href="https://koalendar.com/e/meet-with-javier-pena"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary-foreground/90 hover:text-primary-foreground transition-colors font-semibold underline underline-offset-4 group ml-1"
                        >
                            Book Here
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </>
                ) : (
                    <span>Focus Funnel now available on dashboard 🎯</span>
                )}
            </div>
        </div>
    );
};

export default ProUpgradeBanner;


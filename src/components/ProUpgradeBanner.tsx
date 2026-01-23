
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const ProUpgradeBanner = () => {
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        // Set banner height once loading is done, as we will show banner for both auth and unauth users
        if (!loading) {
            document.documentElement.style.setProperty('--banner-height', '40px');
        } else {
            document.documentElement.style.removeProperty('--banner-height');
        }

        return () => {
            document.documentElement.style.removeProperty('--banner-height');
        };
    }, [loading]);

    if (loading) return null;

    return (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/50 backdrop-blur-sm sticky top-0 z-[100]">
            <div className="container mx-auto px-4 h-10 flex items-center justify-center gap-2 text-sm font-medium">
                {isAuthenticated ? (
                    <>
                        <span className="text-foreground/80">Give us your feedback and get a free Pro upgrade</span>
                        <a
                            href="https://koalendar.com/e/meet-with-javier-pena"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold group ml-1"
                        >
                            Book Here
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </>
                ) : (
                    <>
                        <span className="text-foreground/80">New here? Chat with us and unlock Pro</span>
                        <a
                            href="https://creatives-takeover.com/signup"
                            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold group ml-1"
                        >
                            Get started
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProUpgradeBanner;

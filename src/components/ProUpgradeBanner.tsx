
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ProUpgradeBanner = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-10 flex items-center justify-center gap-2 text-sm font-medium">
        <span className="text-foreground/80">Considering Pro? Talk to us about upgrading</span>
        <a 
          href="https://koalendar.com/e/meet-with-javier-pena" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold group ml-1"
        >
          Book Here
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
};

export default ProUpgradeBanner;

import { Investor } from "@/types/investor";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus } from "lucide-react";
import VCCard from "./VCCard";

interface VCGridProps {
  vcs: Investor[];
  canViewProfiles?: boolean;
  isAuthenticated?: boolean | null;
}

const VCGrid = ({ vcs, canViewProfiles = true, isAuthenticated = true }: VCGridProps) => {
  if (vcs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-2">No VCs found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  // Unauthenticated: show blurred preview with sign-in overlay
  if (isAuthenticated === false) {
    return (
      <div className="relative">
        {/* Blurred VC cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none pointer-events-none blur-[6px]" aria-hidden="true">
          {vcs.slice(0, 6).map((vc) => (
            <VCCard key={vc.id} vc={vc} canViewProfile={false} />
          ))}
        </div>

        {/* Sign-in overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
          <div className="text-center max-w-md px-6 py-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Unlock VC Profiles</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Create a free account to browse VC profiles, filter by investment stage
              and industry, and discover the right investors for your startup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link to="/auth">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Starter unlocks 2 VC profiles per cycle, Rising unlocks 10, and Pro is unlimited
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vcs.map((vc) => (
        <VCCard key={vc.id} vc={vc} canViewProfile={canViewProfiles} />
      ))}
    </div>
  );
};

export default VCGrid;

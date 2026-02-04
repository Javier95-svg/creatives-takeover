import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AcceleratorFilters from "@/components/accelerator/AcceleratorFilters";
import { useAcceleratorSearch } from "@/hooks/useAcceleratorSearch";
import { AcceleratorFilters as AcceleratorFiltersType } from "@/types/insighta";
import FundingOpportunityCard from "@/components/funding/FundingOpportunityCard";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AcceleratorHuntTab = () => {
  const [filters, setFilters] = useState<AcceleratorFiltersType>({});
  const { accelerators, loading, error } = useAcceleratorSearch(filters);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <AcceleratorFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={accelerators.length}
      />

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Loading accelerators...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      ) : isAuthenticated === false ? (
        <div className="relative">
          {/* Blurred accelerator cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none pointer-events-none blur-[6px]" aria-hidden="true">
            {accelerators.slice(0, 6).map((accelerator) => (
              <FundingOpportunityCard
                key={accelerator.id}
                opportunity={accelerator}
                profileLink={`/insighta/accelerator/${accelerator.slug || accelerator.id}`}
              />
            ))}
          </div>

          {/* Sign-in overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
            <div className="text-center max-w-md px-6 py-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Unlock Accelerator Programs</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Create a free account to browse accelerator programs, compare funding
                opportunities, and find the right program to launch your startup.
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
                Free plan includes full access to accelerator profiles
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {accelerators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accelerators.map((accelerator) => (
                <FundingOpportunityCard
                  key={accelerator.id}
                  opportunity={accelerator}
                  profileLink={`/insighta/accelerator/${accelerator.slug || accelerator.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-2">No accelerators found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AcceleratorHuntTab;

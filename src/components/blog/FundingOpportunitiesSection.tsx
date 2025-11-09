import React, { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useFundingOpportunities } from "@/hooks/useFundingOpportunities";
import FundingOpportunityCard from "@/components/funding/FundingOpportunityCard";
import FundingFilters from "@/components/funding/FundingFilters";
import { FundingFilters as FundingFiltersType } from "@/types/funding";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FundingOpportunitiesSectionProps {
  filters?: FundingFiltersType;
  onFiltersChange?: (filters: FundingFiltersType) => void;
}

const FundingOpportunitiesSection = ({ 
  filters: externalFilters,
  onFiltersChange 
}: FundingOpportunitiesSectionProps) => {
  const [internalFilters, setInternalFilters] = useState<FundingFiltersType>({});
  const filters = externalFilters || internalFilters;
  const handleFiltersChange = onFiltersChange || setInternalFilters;
  
  const { opportunities, loading, error } = useFundingOpportunities(filters);
  const { opportunities: allOpportunities, loading: allLoading } = useFundingOpportunities({}); // Fetch all for locations

  // Get unique locations from all opportunities (not filtered)
  const availableLocations = useMemo(() => {
    const locationsSet = new Set<string>();
    // Use filtered opportunities if all opportunities are still loading, otherwise use all
    const source = allOpportunities.length > 0 ? allOpportunities : opportunities;
    source.forEach(opp => {
      opp.location.forEach(loc => locationsSet.add(loc));
    });
    return Array.from(locationsSet).sort();
  }, [allOpportunities, opportunities]);


  // Show loading only if we don't have any opportunities yet
  if (loading && opportunities.length === 0) {
    return (
      <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
                Funding Opportunities
              </h2>
              <span className="text-4xl md:text-5xl">💰</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Only show error if we have an error AND no opportunities (fallback should have loaded data)
  if (error && opportunities.length === 0) {
    return (
      <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Unable to load funding opportunities. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
      {/* Animated funding wallpaper */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        {/* Animated orbital gradient */}
        <div
          className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
            animationDuration: '28s'
          }}
        />

        {/* Blurred accent orbs */}
        <div className="absolute top-24 left-1/4 w-80 h-80 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-20 right-1/5 w-72 h-72 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDuration: '7.5s' }} />
        <div className="absolute top-1/3 right-[38%] w-64 h-64 rounded-full bg-accent/15 blur-3xl animate-ping" style={{ animationDuration: '9s' }} />

        {/* Animated diagonal lines */}
        <div
          className="absolute inset-0 opacity-20 animate-[spin_32s_linear_infinite]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.12) 25%, transparent 25%, transparent 50%, rgba(99,102,241,0.12) 50%, rgba(99,102,241,0.12) 75%, transparent 75%, transparent)',
            backgroundSize: '220px 220px',
            animationDuration: '32s'
          }}
        />

        {/* Pulsing dotted grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="funding-dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="rgba(59,130,246,0.18)">
                <animate attributeName="opacity" values="0.35;0.7;0.35" dur="4s" repeatCount="indefinite" />
              </circle>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#funding-dots)" />
        </svg>
      </div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Funding Opportunities
            </h2>
            <span className="text-4xl md:text-5xl">💰</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4">
            Find grants, accelerators, contests, and microfunds for your project
          </p>
        </div>

        {/* Filters */}
        <FundingFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableLocations={availableLocations}
          resultCount={opportunities.length}
        />

        {/* Opportunities Grid */}
        {opportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opportunity) => (
              <FundingOpportunityCard 
                key={opportunity.id} 
                opportunity={opportunity} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No funding opportunities found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters to see more results
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FundingOpportunitiesSection;

import { useState } from "react";
import { Rocket } from "lucide-react";
import AcceleratorFilters from "@/components/accelerator/AcceleratorFilters";
import { useAcceleratorSearch } from "@/hooks/useAcceleratorSearch";
import { AcceleratorFilters as AcceleratorFiltersType } from "@/types/insighta";
import FundingOpportunityCard from "@/components/funding/FundingOpportunityCard";

const AcceleratorHuntTab = () => {
  const [filters, setFilters] = useState<AcceleratorFiltersType>({});
  const { accelerators, loading, error } = useAcceleratorSearch(filters);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Accelerator Hunt
            </h2>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Discover accelerator programs offering funding, mentorship, and resources.
            Filter by location, industry focus, and funding amount to find the best fit.
          </p>
        </div>

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
      ) : (
        <>
          {accelerators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accelerators.map((accelerator) => (
                <FundingOpportunityCard
                  key={accelerator.id}
                  opportunity={accelerator}
                  profileLink={`/insighta/accelerator/${accelerator.id}`}
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

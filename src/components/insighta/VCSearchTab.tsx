import { useState } from "react";
import { Users } from "lucide-react";
import VCFilters from "@/components/vc/VCFilters";
import VCGrid from "@/components/vc/VCGrid";
import { useVCSearch } from "@/hooks/useVCSearch";
import { VCFilters as VCFiltersType } from "@/types/insighta";

const VCSearchTab = () => {
  const [filters, setFilters] = useState<VCFiltersType>({});
  const { vcs, loading, error } = useVCSearch(filters);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Find Your Perfect VC
            </h2>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Search and filter through venture capitalists by investment stage,
            industry, check size, and geography. Click any VC to view their full profile
            and contact information.
          </p>
        </div>

      {/* Filters */}
      <VCFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={vcs.length}
      />

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Loading VCs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <VCGrid vcs={vcs} />
      )}
    </div>
  );
};

export default VCSearchTab;

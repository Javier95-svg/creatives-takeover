import { useState } from "react";
import VCFilters from "@/components/vc/VCFilters";
import VCGrid from "@/components/vc/VCGrid";
import { useVCSearch } from "@/hooks/useVCSearch";
import { VCFilters as VCFiltersType } from "@/types/insighta";

const VCSearchTab = () => {
  const [filters, setFilters] = useState<VCFiltersType>({});
  const { vcs, loading, error } = useVCSearch(filters);

  return (
    <div className="space-y-6">
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

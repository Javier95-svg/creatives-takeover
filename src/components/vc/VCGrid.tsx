import { Investor } from "@/types/investor";
import VCCard from "./VCCard";

interface VCGridProps {
  vcs: Investor[];
}

const VCGrid = ({ vcs }: VCGridProps) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vcs.map((vc) => (
        <VCCard key={vc.id} vc={vc} />
      ))}
    </div>
  );
};

export default VCGrid;

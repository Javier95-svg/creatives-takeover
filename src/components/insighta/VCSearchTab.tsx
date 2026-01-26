import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VCFilters from "@/components/vc/VCFilters";
import VCGrid from "@/components/vc/VCGrid";
import { useVCSearch } from "@/hooks/useVCSearch";
import { useVCViewTracking } from "@/hooks/useVCViewTracking";
import { VCFilters as VCFiltersType } from "@/types/insighta";
import { TIER_DETAILS } from "@/config/constants";

const VCSearchTab = () => {
  const [filters, setFilters] = useState<VCFiltersType>({});
  const { vcs, loading, error } = useVCSearch(filters);
  const {
    canViewMore,
    remaining,
    hasUnlimitedViews,
    currentTier,
    limit,
    loading: vcViewLoading,
    isAuthenticated,
  } = useVCViewTracking();

  const isLimitReached = !vcViewLoading && !hasUnlimitedViews && remaining === 0;
  const isLowRemaining = !vcViewLoading && !hasUnlimitedViews && remaining > 0 && remaining <= 1;
  const showUpgradeBanner = isLimitReached || isLowRemaining;
  const upgradeTier = currentTier === "free" ? "creator" : "professional";
  const upgradeDetails = TIER_DETAILS[upgradeTier as keyof typeof TIER_DETAILS];
  const currentLimitLabel = hasUnlimitedViews ? "Unlimited VC views" : `${limit} VC views/month`;
  const upgradeViewsLabel = upgradeDetails.vcViewLimit === -1
    ? "Unlimited VC views"
    : `${upgradeDetails.vcViewLimit} VC views/month`;
  const upgradeTitle = isLimitReached
    ? "VC view limit reached"
    : `Only ${remaining} VC view${remaining === 1 ? "" : "s"} left this month`;
  const upgradeCopy = isLimitReached
    ? `Your plan includes ${currentLimitLabel}. Upgrade to ${upgradeDetails.name} for ${upgradeViewsLabel} and ${upgradeDetails.credits} credits/month.`
    : `Keep your research moving. ${upgradeDetails.name} gives you ${upgradeViewsLabel} and ${upgradeDetails.credits} credits/month.`;
  const canViewProfiles = vcViewLoading ? true : canViewMore;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <VCFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={vcs.length}
      />

      {showUpgradeBanner && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">VC Search</Badge>
                <Badge variant="outline">{currentLimitLabel}</Badge>
                {isLowRemaining && (
                  <Badge variant="outline">{remaining} left</Badge>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{upgradeTitle}</p>
                <p className="text-sm text-muted-foreground">{upgradeCopy}</p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/pricing">Upgrade to {upgradeDetails.name}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
        <VCGrid vcs={vcs} canViewProfiles={canViewProfiles} isAuthenticated={isAuthenticated} />
      )}
    </div>
  );
};

export default VCSearchTab;

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AcceleratorFilters from "@/components/accelerator/AcceleratorFilters";
import { useAcceleratorSearch } from "@/hooks/useAcceleratorSearch";
import { useAcceleratorViewTracking } from "@/hooks/useAcceleratorViewTracking";
import { AcceleratorFilters as AcceleratorFiltersType } from "@/types/insighta";
import FundingOpportunityCard from "@/components/funding/FundingOpportunityCard";
import InsightaPagination from "@/components/insighta/InsightaPagination";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus } from "lucide-react";
import { TIER_DETAILS } from "@/config/constants";
import { PREVIEW_MODE_CONTENT_BLUR, PREVIEW_MODE_OVERLAY_BACKGROUND } from "@/components/ui/previewOverlayStyles";

const AcceleratorHuntTab = () => {
  const [filters, setFilters] = useState<AcceleratorFiltersType>({});
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { accelerators, loading, error, total } = useAcceleratorSearch(filters, page, pageSize);
  const {
    canViewMore,
    remaining,
    hasUnlimitedViews,
    currentTier,
    limit,
    loading: acceleratorViewLoading,
    isAuthenticated,
  } = useAcceleratorViewTracking();

  const isLimitReached = !acceleratorViewLoading && !hasUnlimitedViews && remaining === 0;
  const isLowRemaining = !acceleratorViewLoading && !hasUnlimitedViews && remaining > 0 && remaining <= 1;
  const showUpgradeBanner = isLimitReached || isLowRemaining;
  const upgradeTier = currentTier === "rookie" ? "rising" : "pro";
  const upgradeDetails = TIER_DETAILS[upgradeTier as keyof typeof TIER_DETAILS];
  const canViewProfiles = acceleratorViewLoading ? true : canViewMore;
  const currentLimitLabel = hasUnlimitedViews ? "Unlimited accelerator views" : `${limit} accelerator views/month`;
  const upgradeViewsLabel = upgradeDetails.vcViewLimit === -1
    ? "Unlimited accelerator views"
    : `${upgradeDetails.vcViewLimit} accelerator views/month`;
  const upgradeTitle = isLimitReached
    ? "Accelerator view limit reached"
    : `Only ${remaining} accelerator view${remaining === 1 ? "" : "s"} left this month`;
  const upgradeCopy = isLimitReached
    ? `Your plan includes ${currentLimitLabel}. Upgrade to ${upgradeDetails.name} for ${upgradeViewsLabel} and ${upgradeDetails.credits} credits/month.`
    : `Keep your research moving. ${upgradeDetails.name} gives you ${upgradeViewsLabel} and ${upgradeDetails.credits} credits/month.`;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const filterResetKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [filterResetKey]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <AcceleratorFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={total || accelerators.length}
      />

      {showUpgradeBanner && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">Accelerator Hunt</Badge>
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
          <p className="mt-4 text-muted-foreground">Loading accelerators...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      ) : isAuthenticated === false ? (
        <>
          <div className="relative">
            <div
              className="grid grid-cols-1 gap-6 select-none pointer-events-none md:grid-cols-2 lg:grid-cols-3"
              aria-hidden="true"
              style={{ filter: PREVIEW_MODE_CONTENT_BLUR, willChange: 'filter' }}
            >
              {accelerators.slice(0, 6).map((accelerator) => (
                <FundingOpportunityCard
                  key={accelerator.id}
                  opportunity={accelerator}
                  profileLink={`/insighta/accelerator/${accelerator.slug || accelerator.id}`}
                  canViewProfile={false}
                />
              ))}
            </div>

            <div
              className="absolute inset-0 flex items-center justify-center rounded-xl"
              style={{ background: PREVIEW_MODE_OVERLAY_BACKGROUND }}
            >
              <div className="text-center max-w-md px-6 py-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Unlock Accelerator Profiles</h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Create a free account to browse accelerator programs, compare funding opportunities,
                  and shortlist the right programs for your startup.
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
                  Sign up free — browse accelerators on any plan
                </p>
              </div>
            </div>
          </div>
          <InsightaPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <>
          {accelerators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accelerators.map((accelerator) => (
                <FundingOpportunityCard
                  key={accelerator.id}
                  opportunity={accelerator}
                  profileLink={`/insighta/accelerator/${accelerator.slug || accelerator.id}`}
                  canViewProfile={canViewProfiles}
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
          <InsightaPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AcceleratorHuntTab;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VCFilters from "@/components/vc/VCFilters";
import VCGrid from "@/components/vc/VCGrid";
import InsightaPagination from "@/components/insighta/InsightaPagination";
import { useVCSearch } from "@/hooks/useVCSearch";
import { useVCViewTracking } from "@/hooks/useVCViewTracking";
import { VCFilters as VCFiltersType } from "@/types/insighta";
import { PLAN_SUMMARIES } from "@/config/planPermissions";
import { normalizePlanId, trackUpgradeClicked } from "@/lib/analytics";
import { useInsightaPipeline } from "@/hooks/useInsightaPipeline";

const VC_FILTERS_KEY = 'insighta:vc-filters:v1';

const readSavedFilters = (): VCFiltersType => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(VC_FILTERS_KEY) || '{}') as VCFiltersType;
  } catch {
    return {};
  }
};

// How many cards the grid shows before the query resolves. Anonymous visitors
// get a six-card preview; signed-in users can page through more, but reserving
// six removes the bulk of the shift in both cases.
const VC_PREVIEW_CARDS = 6;

const VCSearchTab = () => {
  const [filters, setFilters] = useState<VCFiltersType>(readSavedFilters);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { vcs, loading, error, total } = useVCSearch(filters, page, pageSize);
  const {
    canViewMore,
    remaining,
    hasUnlimitedViews,
    currentTier,
    limit,
    upgradeTarget,
    loading: vcViewLoading,
    isAuthenticated,
  } = useVCViewTracking();
  const pipeline = useInsightaPipeline();

  const isLimitReached = !vcViewLoading && !hasUnlimitedViews && remaining === 0;
  const isLowRemaining = !vcViewLoading && !hasUnlimitedViews && remaining > 0 && remaining <= 1;
  const showUpgradeBanner = isLimitReached || isLowRemaining;
  const upgradeTier = upgradeTarget ?? (currentTier === "rookie" ? "starter" : currentTier === "starter" ? "rising" : "pro");
  const upgradeDetails = PLAN_SUMMARIES[upgradeTier];
  const currentLimitLabel = hasUnlimitedViews ? "Unlimited VC views" : `${limit} VC views/month`;
  const upgradeViewsLabel = upgradeDetails.vcViewLimit === Infinity
    ? "Unlimited VC views"
    : `${upgradeDetails.vcViewLimit} VC views/month`;
  const upgradeTitle = isLimitReached
    ? "VC view limit reached"
    : `Only ${remaining} VC view${remaining === 1 ? "" : "s"} left this month`;
  const upgradeCopy = isLimitReached
    ? `Your plan includes ${currentLimitLabel}. Upgrade to ${upgradeDetails.name} for ${upgradeViewsLabel} and ${upgradeDetails.monthlyCredits} credits/month.`
    : `Keep your research moving. ${upgradeDetails.name} gives you ${upgradeViewsLabel} and ${upgradeDetails.monthlyCredits} credits/month.`;

  const canViewProfiles = vcViewLoading ? true : canViewMore;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  useEffect(() => {
    setPage(1);
  }, [filters?.investment_stage, filters?.industry, filters?.geographic_focus, filters?.check_size_min, filters?.check_size_max, filters?.search]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VC_FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // Filter persistence is a progressive enhancement.
    }
  }, [filters]);

  return (
    <div className="space-y-6">
      <VCFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={total || vcs.length}
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
              <Link
                to="/pricing"
                onClick={() =>
                  trackUpgradeClicked({
                    from_plan: normalizePlanId(currentTier),
                    to_plan: normalizePlanId(upgradeTier),
                    location: "feature_gate",
                  })
                }
              >
                Upgrade to {upgradeDetails.name}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        // A ~130px spinner was replaced by the VC grid once the query resolved,
        // pushing the footer down — measured CLS 0.177 desktop / 0.109 mobile.
        // Same shape as the /investors and /newspaper fixes: skeletons in the
        // grid the real cards use, at the measured card height (511px, 491px at
        // lg). Anonymous visitors see a six-card preview, which is the case this
        // reserves for.
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-busy="true"
          aria-label="Loading VCs"
        >
          {Array.from({ length: VC_PREVIEW_CARDS }).map((_, index) => (
            <div
              key={index}
              className="min-h-[511px] lg:min-h-[491px] rounded-card border border-border/60 bg-card/60 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <VCGrid
            vcs={vcs}
            canViewProfiles={canViewProfiles}
            isAuthenticated={isAuthenticated}
            isSaved={(id) => pipeline.isSaved('vc', id)}
            saving={pipeline.pending}
            onSave={(vc) => pipeline.saveItem({
              entityType: 'vc',
              entityId: vc.id,
              entityLabel: vc.firm_name,
              entityRoute: `/insighta/vc/${vc.slug}`,
            })}
          />
          <InsightaPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default VCSearchTab;

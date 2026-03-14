import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AngelCard } from "@/components/angels/AngelCard";
import { Sparkles, Loader2, Edit, Search, ChevronDown, X, Lock, Crown, ArrowRight } from "lucide-react";
import { AngelInvestor } from "@/types/angel";
import { useAngels } from "@/hooks/useAngels";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";

import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const ANGELS_PER_PAGE = 10;

const ANGEL_HIGHLIGHTS = [
  {
    title: "Stage-aware search",
    description: "Shortlist investors by pre-seed and seed relevance instead of browsing random firms.",
    icon: Sparkles,
  },
  {
    title: "Focused profiles",
    description: "Review investor names, firms, and fit signals before deciding who belongs on your list.",
    icon: Search,
  },
  {
    title: "Raise with intention",
    description: "Build a tighter shortlist and approach investors with a clearer sense of who you want to target.",
    icon: ArrowRight,
  },
];


const INVESTMENT_STAGE_OPTIONS = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
];

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const FindYourAngel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { currentTier } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { fetchAngels, loading } = useAngels();
  const isPro = isAdmin || currentTier === 'professional';
  const [angels, setAngels] = useState<AngelInvestor[]>([]);

  // Initialize state from URL params (fix 4b: persist filters in URL)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedStages, setSelectedStages] = useState<string[]>(() => {
    const stagesParam = searchParams.get("stages");
    return stagesParam ? stagesParam.split(",").filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "alphabetical");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);


  useEffect(() => {
    loadAngels();
  }, []);

  const loadAngels = async () => {
    try {
      const fetched = await fetchAngels();
      setAngels(fetched);
    } catch (error) {
      console.error('Error loading angel investors:', error);
      setAngels([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Sync debounced search to URL and reset page
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleStageToggle = (stage: string) => {
    setSelectedStages((prev) => {
      const next = prev.includes(stage)
        ? prev.filter((s) => s !== stage)
        : [...prev, stage];
      // Sync to URL
      const params = new URLSearchParams(searchParams);
      if (next.length > 0) {
        params.set("stages", next.join(","));
      } else {
        params.delete("stages");
      }
      params.set("page", "1");
      setSearchParams(params, { replace: true });
      return next;
    });
  };

  const clearStageFilter = () => {
    setSelectedStages([]);
    const params = new URLSearchParams(searchParams);
    params.delete("stages");
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    const params = new URLSearchParams(searchParams);
    if (newSort !== "alphabetical") {
      params.set("sort", newSort);
    } else {
      params.delete("sort");
    }
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedStages([]);
    setSortBy("alphabetical");
    const params = new URLSearchParams();
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const hasActiveFilters = searchQuery.length > 0 || selectedStages.length > 0;

  // Filtered and sorted angels based on debounced search, stage filters, and sort
  const filteredAngels = useMemo(() => {
    let result = angels;

    // Search filter (uses debounced value)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (angel) =>
          angel.name.toLowerCase().includes(query) ||
          angel.firm_name.toLowerCase().includes(query) ||
          angel.investment_stages?.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Investment stage filter
    if (selectedStages.length > 0) {
      result = result.filter((angel) =>
        selectedStages.some((stage) => angel.investment_stages?.includes(stage))
      );
    }

    // Sorting
    result = [...result];
    switch (sortBy) {
      case "alphabetical":
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "firm":
        result.sort((a, b) => a.firm_name.localeCompare(b.firm_name));
        break;
    }

    return result;
  }, [angels, debouncedSearch, selectedStages, sortBy]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
    const grid = document.getElementById("angel-grid");
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Generate page numbers to display with ellipsis
  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Pagination calculations (based on filtered results)
  const totalPages = Math.ceil(filteredAngels.length / ANGELS_PER_PAGE);
  const startIndex = (currentPage - 1) * ANGELS_PER_PAGE;
  const endIndex = startIndex + ANGELS_PER_PAGE;
  const paginatedAngels = filteredAngels.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  }, [currentPage, totalPages, searchParams, setSearchParams]);

  const descriptionText = "Browse angel investors and early-stage VCs, filter by stage, and build a sharper shortlist for the round you are actually raising.";

  return (
    <>
      <Helmet>
        <title>Find your Angel | Connect with Investors</title>
        <meta
          name="description"
          content="Find and connect with Angel Investors or Venture Capitalists. Browse investor profiles, explore focus areas, and build relationships that fund your vision."
        />
      </Helmet>
      <div className="min-h-screen bg-background relative">
        <HomeWallpaper />
        <Navigation />
        <div className="pt-16 relative z-10">
          {/* Hero Section */}
          <section className="relative py-10 lg:py-14">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-[2rem] border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-slate-950/70 sm:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-5">
                      <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
                        Community marketplace
                      </span>

                      <div className="max-w-3xl space-y-3">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                          <span className="gradient-unified creatives-font">
                            Find your Angel
                          </span>
                        </h1>
                        <p
                          className="max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg"
                          style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}
                        >
                          {descriptionText}
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button asChild className="self-start rounded-full">
                        <Link to="/community/angels/admin/new">
                          Create Angel Investor
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {ANGEL_HIGHLIGHTS.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.title}
                          className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm dark:bg-slate-900/70"
                        >
                          <Icon className="mb-3 h-5 w-5 text-sky-600 dark:text-sky-300" />
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-[1.75rem] border border-border/60 bg-background/80 p-4 shadow-sm dark:bg-slate-900/75 sm:p-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="relative w-full xl:max-w-md">
                        {isPro ? (
                          <>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search investors by name, firm, or stage"
                              value={searchQuery}
                              onChange={handleSearchChange}
                              aria-label="Search angel investors by name, firm, or stage"
                              className="h-11 min-h-[44px] w-full rounded-full border-border/70 bg-background pl-10 text-base md:text-sm"
                            />
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative opacity-60">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search investors by name, firm, or stage"
                                  disabled
                                  aria-label="Search angel investors (upgrade to unlock)"
                                  className="pointer-events-none h-11 min-h-[44px] w-full rounded-full border-border/70 bg-background pl-10 text-base md:text-sm"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upgrade to Professional to unlock search</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground xl:max-w-sm xl:text-right">
                        Filter by investment stage, sort your shortlist, and focus on investors that match your raise.
                      </p>
                    </div>

                    {!isPro && (
                      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                        Professional unlocks investor search, filters, sorting, and full profile access.
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        {isPro ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-9 rounded-full",
                                  selectedStages.length > 0 && "border-primary bg-primary/5"
                                )}
                              >
                                Investment Stage
                                {selectedStages.length > 0 && (
                                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                                    {selectedStages.length}
                                  </Badge>
                                )}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label className="font-semibold">Investment Stage</Label>
                                  {selectedStages.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={clearStageFilter}
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  {INVESTMENT_STAGE_OPTIONS.map((stage) => (
                                    <div
                                      key={stage}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`filter-stage-${stage}`}
                                        checked={selectedStages.includes(stage)}
                                        onCheckedChange={() => handleStageToggle(stage)}
                                      />
                                      <Label
                                        htmlFor={`filter-stage-${stage}`}
                                        className="flex-1 cursor-pointer font-normal"
                                      >
                                        {stage}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-9 rounded-full opacity-50 cursor-not-allowed"
                                disabled
                              >
                                Investment Stage
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upgrade to Professional to unlock filters</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {hasActiveFilters && isPro && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="h-9 rounded-full text-muted-foreground hover:text-foreground"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Clear all
                          </Button>
                        )}
                      </div>

                      <div className="sm:ml-auto flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort by:</span>
                        {isPro ? (
                          <Select value={sortBy} onValueChange={handleSortChange}>
                            <SelectTrigger className="h-9 w-[180px] rounded-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                              <SelectItem value="newest">Newest first</SelectItem>
                              <SelectItem value="oldest">Oldest first</SelectItem>
                              <SelectItem value="firm">By firm name</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-not-allowed opacity-50">
                                <Select value="alphabetical" disabled>
                                  <SelectTrigger className="pointer-events-none h-9 w-[180px] rounded-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </Select>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upgrade to Professional to unlock sorting</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Angel Investors Section */}
          <section id="angel-grid" className="container mx-auto max-w-6xl px-4 pb-12 pt-2 relative z-10 sm:px-6">
            {/* Results Count (fix 2b: hide exact count for non-Pro) */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading angel investors...</span>
                </div>
              ) : isPro ? (
                <p className="text-sm text-muted-foreground">
                  {filteredAngels.length} angel investor{filteredAngels.length !== 1 ? 's' : ''} found
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {angels.length} angel investor{angels.length !== 1 ? 's' : ''} found
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Use the directory to build a tighter investor shortlist before you start outbound.
              </p>
            </div>

            {/* Angel Investor Cards Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading angel investors...</p>
              </div>
            ) : filteredAngels.length > 0 ? (
              <>
                {/* Pro users: full access */}
                {isPro ? (
                  <div className="grid grid-cols-1 gap-6">
                    {paginatedAngels.map((angel, index) => (
                      <div key={angel.id} className="relative group">
                        <AngelCard
                          angel={angel}
                          priority={index < 4}
                        />
                        {/* Admin Edit Button - Overlay (fix 3c: visible on touch) */}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/community/angels/admin/edit/${angel.id}`);
                            }}
                            className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm hover:bg-background z-10"
                            aria-label={`Edit ${angel.name}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Non-Pro users: blurred cards with upgrade overlay */
                  <div className="relative min-h-[400px]">
                    {/* Blurred angel cards (fix 2c: min-height for overlay) */}
                    <div className="grid grid-cols-1 gap-6 select-none pointer-events-none blur-[6px]" aria-hidden="true">
                      {paginatedAngels.map((angel, index) => (
                        <AngelCard
                          key={angel.id}
                          angel={angel}
                          priority={index < 4}
                        />
                      ))}
                    </div>

                    {/* Upgrade overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
                      <div className="text-center max-w-md px-6 py-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
                          <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                          Unlock Angel Investor Profiles
                        </h3>
                        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                          Upgrade to Professional to access full angel investor and VC profiles, explore their focus areas, investment stages, and connect with investors who can fund your vision.
                        </p>
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={() =>
                            openUpgradePrompt({
                              reason: 'feature',
                              featureName: 'Angel Investor Profiles',
                              requiredTier: 'professional',
                              description: 'Professional plan gives you unlimited access to all angel investor profiles.',
                            })
                          }
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to Professional
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          Get full access to all investor profiles
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pagination — always visible so users see there are multiple pages (fix 6a: proper hrefs) */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        {isPro && currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              href={`?page=${currentPage - 1}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage - 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                        {getPageNumbers(totalPages, currentPage).map((page, index) => {
                          if (page === "ellipsis") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href={`?page=${page}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isPro) {
                                    handlePageChange(page as number);
                                  } else {
                                    openUpgradePrompt({
                                      reason: 'feature',
                                      featureName: 'Angel Investor Profiles',
                                      requiredTier: 'professional',
                                      description: 'Professional plan gives you unlimited access to all angel investor profiles.',
                                    });
                                  }
                                }}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {isPro && currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              href={`?page=${currentPage + 1}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage + 1);
                              }}
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : angels.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No angel investors yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Angel investor profiles will appear here once they're added.
                  </p>
                  {isAdmin && (
                    <Button asChild>
                      <Link to="/community/angels/admin/new">
                        Create First Angel Investor
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-6">
                    No angel investors match your current search or filters. Try adjusting your criteria.
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FindYourAngel;

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
import { AngelCard } from "@/components/angels/AngelCard";
import { Sparkles, Loader2, Edit, Search, ChevronDown, X, Lock, Crown } from "lucide-react";
import { AngelInvestor } from "@/types/angel";
import { useAngels } from "@/hooks/useAngels";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
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

const INVESTMENT_STAGE_OPTIONS = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("alphabetical");
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

  // Reset to page 1 when search or filters change
  const resetToFirstPage = () => {
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    resetToFirstPage();
  };

  const handleStageToggle = (stage: string) => {
    setSelectedStages((prev) =>
      prev.includes(stage)
        ? prev.filter((s) => s !== stage)
        : [...prev, stage]
    );
    resetToFirstPage();
  };

  const clearStageFilter = () => {
    setSelectedStages([]);
    resetToFirstPage();
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    resetToFirstPage();
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedStages([]);
    resetToFirstPage();
  };

  const hasActiveFilters = searchQuery.length > 0 || selectedStages.length > 0;

  // Filtered and sorted angels based on search, stage filters, and sort
  const filteredAngels = useMemo(() => {
    let result = angels;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
  }, [angels, searchQuery, selectedStages, sortBy]);

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

  // Typing animation for description
  const descriptionText = "Find and connect with Angel Investors or Venture Capitalists who believe in bold ideas and back them early. Browse investor profiles, explore their focus areas and investment stages, and take the first step toward building a relationship that could fund your vision.\n\nWhether you are raising your first pre-seed round or looking for a strategic partner at the seed stage, this is where you start.";
  const { displayedText, isTyping } = useTypingAnimation({
    text: descriptionText,
    speed: 20,
    startDelay: 500,
  });

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
          <section className="relative py-20 lg:py-32">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center">
                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 takeover-title creatives-font">
                  <span className="gradient-unified animate-text-flicker">
                    Find your Angel
                  </span>
                </h1>

                {/* Description with typing animation */}
                <div className="max-w-3xl mx-auto mb-8">
                  <p
                    className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed"
                    style={{
                      whiteSpace: 'pre-line',
                      fontFamily: "'Space Grotesk', 'Poppins', sans-serif",
                    }}
                  >
                    {displayedText}
                    {isTyping && (
                      <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Angel Investors Section */}
          <section id="angel-grid" className="container mx-auto px-4 py-12 relative z-10">
            {/* Admin Create Button */}
            {isAdmin && (
              <div className="mb-6 flex justify-end">
                <Button asChild>
                  <Link to="/community/angels/admin/new">
                    Create Angel Investor
                  </Link>
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative w-full max-w-md mx-auto md:mx-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or keyword"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 h-11 w-full min-h-[44px] text-base md:text-sm"
                />
              </div>
            </div>

            {/* Investment Stage Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9",
                      selectedStages.length > 0 && "border-primary bg-primary/5"
                    )}
                  >
                    Investment Stage
                    {selectedStages.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {selectedStages.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 ml-2" />
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
                            className="font-normal cursor-pointer flex-1"
                          >
                            {stage}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear All Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}

              {/* Sort */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="firm">By firm name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading angel investors...</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filteredAngels.length} angel investor{filteredAngels.length !== 1 ? 's' : ''} found
                </p>
              )}
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
                        {/* Admin Edit Button - Overlay */}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/community/angels/admin/edit/${angel.id}`);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm hover:bg-background z-10"
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
                  <div className="relative">
                    {/* Blurred angel cards */}
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

                {/* Pagination — always visible so users see there are multiple pages */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        {isPro && currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
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
                                href="#"
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
                              href="#"
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

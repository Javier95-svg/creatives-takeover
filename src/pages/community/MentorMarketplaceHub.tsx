import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityMentorsWallpaper from "@/components/wallpapers/CommunityMentorsWallpaper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { TopFilterBar } from "@/components/mentor-marketplace/TopFilterBar";
import { MentorFilters } from "@/components/mentor-marketplace/FilterSidebar";
import { Users, Loader2, Search, GraduationCap, ArrowRight } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { sortMentorsAlphabetically } from "@/utils/mentorSort";
import { normalizeMentorExpertiseList } from "@/utils/mentorExpertise";
import { isMentorWithinTimezoneRange, parseTimezoneOffset } from "@/utils/mentorTimezone";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const MENTORS_PER_PAGE = 10;

const MENTOR_HIGHLIGHTS = [
  {
    title: "Startup experts",
    description: "Talk with advisors who have already shipped, raised, or coached at the earliest stages.",
    icon: GraduationCap,
  },
  {
    title: "1:1 working sessions",
    description: "Use each call to pressure test a decision, not just collect generic advice.",
    icon: Users,
  },
  {
    title: "Concrete next steps",
    description: "Leave with sharper priorities, founder-specific feedback, and a clearer execution plan.",
    icon: ArrowRight,
  },
];

const MentorMarketplaceHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentors, loading } = useMentors();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("alphabetical");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  
  const [filters, setFilters] = useState<MentorFilters>({
    expertise: [],
    coachingFormat: [],
    timezone: null,
  });

  useEffect(() => {
    loadMentors();
    
    // Initialize filters from URL query params
    const expertiseParam = searchParams.get("expertise");
    if (expertiseParam) {
      const expertise = decodeURIComponent(expertiseParam);
      setFilters((prev) => ({
        ...prev,
        expertise: normalizeMentorExpertiseList([expertise]),
      }));
      // Clear the query parameter after setting the filter
      setSearchParams({}, { replace: true });
    }
  }, []);

  const loadMentors = async () => {
    try {
      const fetchedMentors = await fetchMentors();
      setMentors(fetchedMentors);
    } catch (error) {
      console.error('Error loading mentors:', error);
      setMentors([]);
    }
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
    // Scroll to top of mentor grid
    const grid = document.getElementById("mentor-grid");
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Reset to page 1 when filters, search, or sort changes
  const handleFiltersChange = (newFilters: MentorFilters) => {
    setFilters(newFilters);
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
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


  const filteredMentors = useMemo(() => {
    const selectedTimezoneOffset = parseTimezoneOffset(filters.timezone);

    let result = mentors.filter((mentor) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          mentor.name.toLowerCase().includes(query) ||
          mentor.bio.toLowerCase().includes(query) ||
          mentor.expertise?.some((e) => e.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Expertise filter
      if (filters.expertise.length > 0) {
        const mentorExpertise = normalizeMentorExpertiseList(mentor.expertise);
        const hasExpertise = filters.expertise.some((e) =>
          mentorExpertise.includes(e)
        );
        if (!hasExpertise) return false;
      }

      // Coaching Format filter
      if (filters.coachingFormat.length > 0) {
        const mentorNameLower = mentor.name.toLowerCase();
        const isMarcBright = mentorNameLower.includes('marc') && mentorNameLower.includes('bright');
        const mentorFormat = isMarcBright ? 'Hourly Rate Basis' : '8 Week Coaching Program';
        const hasFormat = filters.coachingFormat.includes(mentorFormat);
        if (!hasFormat) return false;
      }

      // Time zone filter (exact or +/- 1 hour)
      if (filters.timezone) {
        if (selectedTimezoneOffset === null) return false;
        const isWithinRange = isMentorWithinTimezoneRange(
          mentor,
          selectedTimezoneOffset,
          1
        );
        if (!isWithinRange) return false;
      }

      return true;
    });


    // Apply sorting
    switch (sortBy) {
      case "rating":
        result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-low":
        result = result.sort((a, b) => a.hourly_rate - b.hourly_rate);
        break;
      case "price-high":
        result = result.sort((a, b) => b.hourly_rate - a.hourly_rate);
        break;
      case "newest":
        result = result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
      case "recommended":
        // Featured first, then by rating
        result = result.sort((a, b) => {
          const aFeatured = a.is_featured === true ? 1 : 0;
          const bFeatured = b.is_featured === true ? 1 : 0;
          if (aFeatured !== bFeatured) return bFeatured - aFeatured;
          return (b.rating || 0) - (a.rating || 0);
        });
        break;
      case "alphabetical":
      default:
        // Sort alphabetically by name (A-Z)
        result = sortMentorsAlphabetically(result);
        break;
    }

    return result;
  }, [searchQuery, filters, mentors, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMentors.length / MENTORS_PER_PAGE);
  const startIndex = (currentPage - 1) * MENTORS_PER_PAGE;
  const endIndex = startIndex + MENTORS_PER_PAGE;
  const paginatedMentors = filteredMentors.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params);
    }
  }, [currentPage, totalPages, searchParams, setSearchParams]);

  const allExpertise = useMemo(() => {
    const expertiseSet = new Set<string>();
    mentors.forEach((m) => {
      normalizeMentorExpertiseList(m.expertise).forEach((e) => expertiseSet.add(e));
    });
    const result = Array.from(expertiseSet).sort();
    return result;
  }, [mentors]);

  return (
    <>
      <Helmet>
        <title>Mentor Marketplace | Find Your Startup Mentor</title>
        <meta
          name="description"
          content="Connect with experienced founders and mentors who can guide you through startup execution. Book 1-on-1 sessions with proven entrepreneurs."
        />
      </Helmet>
      <div className="min-h-screen bg-background relative">
        <CommunityMentorsWallpaper />
        <Navigation />
        <div className="pt-16 relative z-10">
          {/* Hero Section */}
          <section className="relative py-10 lg:py-14">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-[2rem] border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-slate-950/70 sm:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-5 lg:flex-1">
                      <div className="max-w-3xl lg:mx-auto">
                        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                          <span className="gradient-unified creatives-font">
                            Find your Mentor
                          </span>
                        </h1>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button asChild className="self-start rounded-full">
                        <Link to="/community/admin/new">
                          Create Mentor
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {MENTOR_HIGHLIGHTS.map((item) => {
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search mentors by name, expertise, or keyword"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          aria-label="Search mentors by name, expertise, or keyword"
                          className="h-11 min-h-[44px] w-full rounded-full border-border/70 bg-background pl-10 text-base md:text-sm"
                        />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground xl:max-w-sm xl:text-right">
                        Filter by area of expertise, coaching format or timezone.
                      </p>
                    </div>

                    <div className="mt-4">
                      <TopFilterBar
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        availableExpertise={allExpertise}
                        availableStages={["Idea Stage", "Pre-Seed", "Seed", "Series A"]}
                        priceRangeMax={500000}
                        mentorCount={filteredMentors.length}
                        onSortChange={handleSortChange}
                        sortBy={sortBy}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mentors Section with Filters */}
          <section id="mentor-grid" className="container mx-auto max-w-6xl px-4 pb-12 pt-2 relative z-10 sm:px-6">
            {/* Results Count */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading mentors...</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filteredMentors.length} mentor{filteredMentors.length !== 1 ? 's' : ''} ready to support
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Building an international network for a global audience💙
              </p>
            </div>

            {/* Mentor Cards Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading mentors...</p>
              </div>
            ) : filteredMentors.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6">
                  {paginatedMentors.map((mentor, index) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      priority={index < 4}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
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
                                  handlePageChange(page as number);
                                }}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {currentPage < totalPages && (
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
            ) : mentors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No mentors yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Mentor profiles will appear here once they're added to the marketplace.
                  </p>
                  {isAdmin && (
                    <Button asChild>
                      <Link to="/community/admin/new">
                        Create First Mentor
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No mentors found matching your criteria. Try adjusting your filters.
                  </p>
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

export default MentorMarketplaceHub;

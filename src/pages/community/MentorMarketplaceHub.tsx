import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { TopFilterBar } from "@/components/mentor-marketplace/TopFilterBar";
import { MentorFilters } from "@/components/mentor-marketplace/FilterSidebar";
import { Users, Loader2, Search } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
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
  });

  useEffect(() => {
    loadMentors();
    
    // Initialize filters from URL query params
    const expertiseParam = searchParams.get("expertise");
    if (expertiseParam) {
      const expertise = decodeURIComponent(expertiseParam);
      setFilters((prev) => ({
        ...prev,
        expertise: [expertise],
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
        const hasExpertise = filters.expertise.some((e) =>
          mentor.expertise?.includes(e)
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
        result = result.sort((a, b) => a.name.localeCompare(b.name));
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
      m.expertise?.forEach((e) => expertiseSet.add(e));
    });
    const result = Array.from(expertiseSet).sort();
    return result;
  }, [mentors]);

  // Typing animation for description
  const descriptionText = "Work with startup mentors from all over the globe who have built, launched, and raised at the earliest stages. Expect clear, grounded advice that fits the reality of pre seed founders, not theory from later stage playbooks. \n\nBook focused one to one sessions, stress test your roadmap, pitch, and go to market, and leave each call with a short list of concrete next steps. Move from uncertainty to a plan you can actually execute, with someone beside you who has already been through it.";
  const { displayedText, isTyping } = useTypingAnimation({
    text: descriptionText,
    speed: 20,
    startDelay: 500
  });

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
                    Connect. Learn. Grow.
                  </span>
                </h1>
                
                {/* Description with typing animation */}
                <div className="max-w-3xl mx-auto mb-8">
                  <p 
                    className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed" 
                    style={{ 
                      whiteSpace: 'pre-line',
                      fontFamily: "'Space Grotesk', 'Poppins', sans-serif"
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

          {/* Mentors Section with Filters */}
          <section id="mentor-grid" className="container mx-auto px-4 py-12 relative z-10">
            {/* Admin Create Button */}
            {isAdmin && (
              <div className="mb-6 flex justify-end">
                <Button asChild>
                  <Link to="/community/admin/new">
                    Create Mentor
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

            {/* Top Filter Bar */}
            <div className="mb-6">
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

            {/* Results Count */}
            <div className="mb-4">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading mentors...</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filteredMentors.length} mentor{filteredMentors.length !== 1 ? 's' : ''} found
                </p>
              )}
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

import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { TopFilterBar } from "@/components/mentor-marketplace/TopFilterBar";
import { MentorFilters } from "@/components/mentor-marketplace/FilterSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/contexts/AuthContext";
import { useMentors } from "@/hooks/useMentors";
import { Search, ArrowLeft, Loader2, Users } from "lucide-react";
import { sortMentorsAlphabetically } from "@/utils/mentorSort";

const MentorDiscover = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentors, loading } = useMentors();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("alphabetical");
  
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
    }
  }, []);

  // Update filters when URL params change
  useEffect(() => {
    const expertiseParam = searchParams.get("expertise");
    if (expertiseParam) {
      const expertise = decodeURIComponent(expertiseParam);
      setFilters((prev) => {
        if (!prev.expertise.includes(expertise)) {
          return {
            ...prev,
            expertise: [expertise],
          };
        }
        return prev;
      });
    } else {
      // Clear expertise filter if no query param
      setFilters((prev) => ({
        ...prev,
        expertise: [],
      }));
    }
  }, [searchParams]);

  const loadMentors = async () => {
    const fetchedMentors = await fetchMentors();
    setMentors(fetchedMentors);
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
        result = sortMentorsAlphabetically(result);
        break;
    }

    return result;
  }, [searchQuery, filters, mentors, sortBy]);

  const allExpertise = useMemo(() => {
    const expertiseSet = new Set<string>();
    mentors.forEach((m) => {
      m.expertise?.forEach((e) => expertiseSet.add(e));
    });
    return Array.from(expertiseSet).sort();
  }, [mentors]);

  return (
    <>
      <Helmet>
        <title>Discover Mentors | Mentor Marketplace</title>
        <meta
          name="description"
          content="Browse and filter mentors by expertise, price, and availability. Find the perfect mentor for your startup journey."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-16">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/community" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Marketplace
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild>
                    <Link to="/community/admin/new">Create Mentor</Link>
                  </Button>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} to boost your startup journey
              </h1>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Top Filter Bar */}
            <TopFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              availableExpertise={allExpertise}
              availableStages={["Idea Stage", "Pre-Seed", "Seed", "Series A"]}
              priceRangeMax={500000}
              mentorCount={filteredMentors.length}
              onSortChange={setSortBy}
              sortBy={sortBy}
            />

            {/* Results */}
            <div className="mb-4">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading mentors...
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filteredMentors.length} mentor
                  {filteredMentors.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            {/* Mentor Cards Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMentors.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredMentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            ) : mentors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    No mentors yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Mentor profiles will appear here once they're added to the
                    marketplace.
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
                    No mentors found matching your criteria. Try adjusting your
                    filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default MentorDiscover;

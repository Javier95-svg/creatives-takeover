import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { FilterSidebar, MentorFilters } from "@/components/mentor-marketplace/FilterSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/contexts/AuthContext";
import { useMentors } from "@/hooks/useMentors";
import { Search, ArrowLeft, Loader2, Users } from "lucide-react";

const MentorDiscover = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentors, loading } = useMentors();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<MentorFilters>({
    expertise: [],
    priceRange: [0, 50000],
    stage: [],
    availableNow: false,
  });

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    const fetchedMentors = await fetchMentors();
    setMentors(fetchedMentors);
  };

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
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

      // Price range filter
      if (
        mentor.hourly_rate < filters.priceRange[0] ||
        mentor.hourly_rate > filters.priceRange[1]
      ) {
        return false;
      }

      // Available now filter
      if (filters.availableNow && mentor.is_active === false) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters, mentors]);

  const allExpertise = useMemo(() => {
    const expertiseSet = new Set<string>();
    mentors.forEach((m) => {
      m.expertise?.forEach((e) => expertiseSet.add(e));
    });
    return Array.from(expertiseSet);
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
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
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
                      <Link to="/community/admin/new">
                        Create Mentor
                      </Link>
                    </Button>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">Discover Mentors</h1>
                <p className="text-muted-foreground">
                  Find the perfect mentor to guide your startup journey
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, expertise, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Filters Sidebar */}
                <aside className="lg:w-80 flex-shrink-0">
                  <FilterSidebar
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableExpertise={allExpertise}
                    availableStages={["Idea Stage", "Pre-Seed", "Seed", "Series A"]}
                    priceRangeMax={50000}
                  />
                </aside>

                {/* Results Grid */}
                <main className="flex-1">
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
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredMentors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredMentors.map((mentor) => (
                        <MentorCard key={mentor.id} mentor={mentor} />
                      ))}
                    </div>
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
                </main>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MentorDiscover;


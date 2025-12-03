import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { FilterSidebar, MentorFilters } from "@/components/mentor-marketplace/FilterSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/contexts/AuthContext";
import { useMentors } from "@/hooks/useMentors";
import { Search, ArrowLeft, Loader2, Users, Star, Sparkles, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuickFilterType = 'all' | 'popular' | 'new' | 'available' | 'featured' | 'price-low' | 'price-mid' | 'price-high';

const MentorDiscover = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentors, loading } = useMentors();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
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

      // Quick filter specific filters (only apply if not "all")
      if (quickFilter !== 'all') {
        switch (quickFilter) {
          case 'available':
            if (mentor.is_active === false) return false;
            break;
          case 'featured':
            if ((mentor as any).is_featured !== true) return false;
            break;
          case 'price-low':
            if (mentor.hourly_rate > 10000) return false; // $0-100
            break;
          case 'price-mid':
            if (mentor.hourly_rate <= 10000 || mentor.hourly_rate > 20000) return false; // $100-200
            break;
          case 'price-high':
            if (mentor.hourly_rate <= 20000) return false; // $200+
            break;
        }
      }

      // Expertise filter
      if (filters.expertise.length > 0) {
        const hasExpertise = filters.expertise.some((e) =>
          mentor.expertise?.includes(e)
        );
        if (!hasExpertise) return false;
      }

      // Price range filter (only if not using quick price filter)
      if (quickFilter !== 'price-low' && quickFilter !== 'price-mid' && quickFilter !== 'price-high') {
        if (
          mentor.hourly_rate < filters.priceRange[0] ||
          mentor.hourly_rate > filters.priceRange[1]
        ) {
          return false;
        }
      }

      // Available now filter (only if not using quick available filter)
      if (quickFilter !== 'available' && filters.availableNow && mentor.is_active === false) {
        return false;
      }

      return true;
    });

    // Apply quick filter sorting
    switch (quickFilter) {
      case 'popular':
        result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'new':
        result = result.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'price-low':
      case 'price-mid':
      case 'price-high':
        result = result.sort((a, b) => a.hourly_rate - b.hourly_rate);
        break;
      default:
        // Keep original order
        break;
    }

    return result;
  }, [searchQuery, filters, mentors, quickFilter]);

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
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="mb-6">
                <div className="relative">
                  {/* Gradient fade on edges for scroll indication */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                  
                  {/* Horizontal scrolling container */}
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 px-1 py-2 min-w-max">
                      {[
                        { id: 'all' as QuickFilterType, label: 'All', icon: null },
                        { id: 'popular' as QuickFilterType, label: 'Popular', icon: Star },
                        { id: 'featured' as QuickFilterType, label: 'Featured', icon: Sparkles },
                        { id: 'available' as QuickFilterType, label: 'Available Now', icon: CheckCircle2 },
                        { id: 'new' as QuickFilterType, label: 'New', icon: TrendingUp },
                        { id: 'price-low' as QuickFilterType, label: '$0-100/hr', icon: null },
                        { id: 'price-mid' as QuickFilterType, label: '$100-200/hr', icon: null },
                        { id: 'price-high' as QuickFilterType, label: '$200+/hr', icon: null },
                      ].map((filter) => {
                        const Icon = filter.icon;
                        const isActive = quickFilter === filter.id;
                        const count = filter.id === 'all' 
                          ? filteredMentors.length 
                          : filter.id === 'available'
                          ? mentors.filter(m => m.is_active !== false).length
                          : filter.id === 'featured'
                          ? mentors.filter(m => (m as any).is_featured === true).length
                          : undefined;
                        
                        return (
                          <Button
                            key={filter.id}
                            onClick={() => setQuickFilter(filter.id)}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "flex items-center gap-2 whitespace-nowrap transition-all duration-200 touch-manipulation h-9 px-4",
                              isActive 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                                : "hover:bg-muted"
                            )}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            <span className="font-medium text-sm">{filter.label}</span>
                            {isActive && count !== undefined && count > 0 && (
                              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary-foreground/20">
                                {count}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
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


import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { Search, Users, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";

const MentorMarketplaceHub = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentors, loading } = useMentors();
  const [mentors, setMentors] = useState<Mentor[]>([]);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    const fetchedMentors = await fetchMentors();
    setMentors(fetchedMentors);
  };

  const featuredMentors = mentors.filter(m => m.is_featured).length > 0
    ? mentors.filter(m => m.is_featured).slice(0, 3)
    : mentors.slice(0, 3);

  return (
    <>
      <Helmet>
        <title>Mentor Marketplace | Find Your Startup Mentor</title>
        <meta
          name="description"
          content="Connect with experienced founders and mentors who can guide you through startup execution. Book 1-on-1 sessions with proven entrepreneurs."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-16">
          {/* Hero Section */}
          <section className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Find Your Startup Mentor
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Connect with experienced founders and mentors who can guide you through startup execution.
                  Book 1-on-1 sessions and get personalized advice.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg">
                  <Link to="/community/discover">
                    <Search className="h-5 w-5 mr-2" />
                    Discover Mentors
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/community/my-bookings">
                    <Calendar className="h-5 w-5 mr-2" />
                    My Bookings
                  </Link>
                </Button>
              </div>
            </div>
          </section>

            {/* Featured Mentors */}
            <section className="container mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Featured Mentors</h2>
                <Button asChild variant="ghost">
                  <Link to="/community/discover" className="flex items-center gap-2">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : featuredMentors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredMentors.map((mentor) => (
                    <MentorCard key={mentor.id} mentor={mentor} />
                  ))}
                </div>
              ) : (
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
                    <Button asChild variant="outline" className="ml-2">
                      <Link to="/community/discover">
                        Browse All
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default MentorMarketplaceHub;


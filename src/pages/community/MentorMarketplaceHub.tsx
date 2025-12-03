import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { Search, Users, Calendar, MessageCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-12 md:py-20">
              <div className="max-w-3xl mx-auto text-center space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                  Find Your Mentor
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Connect with experienced founders and mentors who can guide you through startup execution.
                  Book 1-on-1 sessions and get personalized advice.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

            {/* How It Works */}
            <section className="container mx-auto px-4 py-12 bg-muted/30">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Search className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">1. Discover</h3>
                      <p className="text-muted-foreground">
                        Browse mentors by expertise, price, and availability. Read reviews and find the perfect match for your needs.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">2. Book</h3>
                      <p className="text-muted-foreground">
                        Select a date and time that works for you. Secure payment with Stripe and receive instant confirmation.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">3. Connect</h3>
                      <p className="text-muted-foreground">
                        Join your session via Zoom and get personalized guidance. Continue the conversation through our messaging platform.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-12">
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-8 md:p-12 text-center space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
                  <p className="text-lg max-w-2xl mx-auto opacity-90">
                    Join hundreds of founders who are accelerating their journey with expert mentorship.
                  </p>
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/community/discover">
                      Browse All Mentors
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MentorMarketplaceHub;


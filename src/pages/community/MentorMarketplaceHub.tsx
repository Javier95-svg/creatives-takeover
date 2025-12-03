import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MentorMarketplaceWallpaper from "@/components/wallpapers/MentorMarketplaceWallpaper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentorCard } from "@/components/mentor-marketplace/MentorCard";
import { Users, ArrowRight, Loader2 } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const MentorMarketplaceHub = () => {
  const navigate = useNavigate();
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

  // Calculate popular expertise tags
  const popularExpertise = useMemo(() => {
    const expertiseCount = new Map<string, number>();
    
    mentors.forEach((mentor) => {
      mentor.expertise?.forEach((exp) => {
        expertiseCount.set(exp, (expertiseCount.get(exp) || 0) + 1);
      });
    });

    return Array.from(expertiseCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([expertise]) => expertise);
  }, [mentors]);

  const handleExpertiseClick = (expertise: string) => {
    navigate(`/community/discover?expertise=${encodeURIComponent(expertise)}`);
  };

  // Typing animation for description
  const descriptionText = "Match with vetted startup coaches for hands-on guidance from first idea to first funding, tailored to the realities of pre-seed founders who are still figuring things out. Book focused 1-on-1 sessions, get actionable feedback on your roadmap, pitch, and go-to-market, and leave each call with clear next steps you can execute immediately.";
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
        <MentorMarketplaceWallpaper />
        <Navigation />
        <div className="pt-16 relative z-10">
          {/* Hero Section */}
          <section className="relative py-20 lg:py-32">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center">
                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 takeover-title creatives-font">
                  <span className="gradient-unified">
                    Connect. Learn. Grow.
                  </span>
                </h1>
                
                {/* Description with typing animation */}
                <div className="max-w-3xl mx-auto mb-8">
                  <p className="text-lg sm:text-xl md:text-2xl text-foreground/90 leading-relaxed">
                    {displayedText}
                    {isTyping && (
                      <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />
                    )}
                  </p>
                </div>

                {/* Popular Expertise Tags */}
                {popularExpertise.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Popular expertise:</span>
                    {popularExpertise.map((expertise) => (
                      <Badge
                        key={expertise}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1"
                        onClick={() => handleExpertiseClick(expertise)}
                      >
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Featured Mentors */}
          <section className="container mx-auto px-4 py-12 relative z-10">
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
        <Footer />
      </div>
    </>
  );
};

export default MentorMarketplaceHub;


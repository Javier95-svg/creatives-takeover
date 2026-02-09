import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AngelCard } from "@/components/angels/AngelCard";
import { Sparkles, Loader2 } from "lucide-react";
import { AngelInvestor } from "@/types/angel";
import { useAngels } from "@/hooks/useAngels";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const FindYourAngel = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchAngels, loading } = useAngels();
  const [angels, setAngels] = useState<AngelInvestor[]>([]);

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
          <section className="container mx-auto px-4 py-12 relative z-10">
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

            {/* Angel Investor Cards Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading angel investors...</p>
              </div>
            ) : angels.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {angels.map((angel, index) => (
                  <AngelCard
                    key={angel.id}
                    angel={angel}
                    priority={index < 4}
                  />
                ))}
              </div>
            ) : (
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
            )}
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FindYourAngel;

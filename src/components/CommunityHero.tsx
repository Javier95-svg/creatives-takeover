import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Users, MessageCircle, Heart, Globe } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="relative bg-gradient-to-br from-background to-primary/5 border-b border-border/30">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageCircle className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
              Tell Your Story. Grow with Us
            </Badge>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent px-2">
            Ask for Feedback
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Connect with fellow entrepreneurs, share your experiences, and learn from real stories that inspire success.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="group w-full sm:w-auto h-12 sm:h-auto touch-manipulation">
                <Heart className="h-4 sm:h-5 w-4 sm:w-5 mr-2 group-hover:animate-pulse" />
                Share Your Story
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Global Community • Free to Join</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityHero;
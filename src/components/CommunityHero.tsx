import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Users, MessageCircle, Heart, Globe } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="relative bg-gradient-to-br from-background to-primary/5 border-b border-border/30">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Join 10,000+ Entrepreneurs
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">
            Share Your Entrepreneurial Journey
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with fellow entrepreneurs, share your experiences, and learn from real stories that inspire success.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/login">
              <Button size="lg" className="group">
                <Heart className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                Share Your Story
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="border-primary/20">
                <Users className="h-5 w-5 mr-2" />
                Explore Community
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
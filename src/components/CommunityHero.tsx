import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Users, MessageCircle, Heart, Globe } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="relative pt-20 pb-8 lg:pt-24 lg:pb-12 border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left side - Welcome & Engagement */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-primary animate-pulse" />
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Share Your Story
                </Badge>
              </div>
              
              <h1 className="text-2xl lg:text-3xl font-bold mb-2 gradient-text">
                Entrepreneur Stories Community
              </h1>
              
              <p className="text-muted-foreground max-w-lg">
                Share your entrepreneurial journey, learn from others, and connect with like-minded founders building the future.
              </p>
            </div>

            {/* Right side - Interaction Prompts */}
            <div className="flex flex-col lg:items-end gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/login">
                  <Button className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                    <Heart className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                    Share Your Story
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                    <Users className="h-4 w-4 mr-2" />
                    Connect & Learn
                  </Button>
                </Link>
              </div>
              <div className="text-center lg:text-right">
                <p className="text-sm text-muted-foreground">
                  Join entrepreneurs sharing their journey
                </p>
                <div className="flex items-center justify-center lg:justify-end gap-1 mt-1">
                  <Globe className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary">Global Community</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityHero;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Users, MessageCircle, Heart, Globe } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Social Proof Badge */}
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Globe className="w-4 h-4 mr-2" />
              Join 50,000+ active community members
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
              Creative Community
              <br />
              <span className="text-primary">Where Ideas Come to Life</span>
            </h1>
          </div>

          {/* Value Proposition */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Connect with fellow creatives, share your work, get feedback, and collaborate 
              on amazing projects in our vibrant <strong className="text-foreground">creative community platform</strong>.
            </p>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50k+</div>
              <div className="text-muted-foreground">Active Creatives</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Projects Shared</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Community Support</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="#join-community">
                Join Our Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#collaboration">
                See Collaboration
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Free to join
            </div>
            <div className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2 text-primary" />
              Instant access
            </div>
            <div className="flex items-center justify-center">
              <Heart className="w-4 h-4 mr-2 text-primary" />
              Supportive environment
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityHero;
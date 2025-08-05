import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Download, Users, Star } from "lucide-react";

const ResourcesHero = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Social Proof Badge */}
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Download className="w-4 h-4 mr-2" />
              100,000+ downloads • Free creative resources
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
              Creative Resources
              <br />
              <span className="text-primary">For Every Creator</span>
            </h1>
          </div>

          {/* Value Proposition */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Access our comprehensive library of <strong className="text-foreground">free creative resources</strong>, 
              including tutorials, design guides, templates, and downloads to enhance your creative skills.
            </p>
          </div>

          {/* Resource Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Free Tutorials</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">200+</div>
              <div className="text-muted-foreground">Design Guides</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Free Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">100k+</div>
              <div className="text-muted-foreground">Happy Learners</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="#tutorials">
                Browse Tutorials
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#downloads">
                Free Downloads
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-center">
              <BookOpen className="w-4 h-4 mr-2 text-primary" />
              Always free access
            </div>
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Expert-created content
            </div>
            <div className="flex items-center justify-center">
              <Star className="w-4 h-4 mr-2 text-primary" />
              Regularly updated
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResourcesHero;
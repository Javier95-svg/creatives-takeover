import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Users, MessageCircle, Heart, Globe, TrendingUp, Star, Award, Target } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="relative bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Hero Content */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Main Hero */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="relative">
                <MessageCircle className="h-6 w-6 text-primary animate-pulse" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 font-medium">
                ✨ Join 10,000+ Entrepreneurs
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-br from-foreground via-primary to-secondary bg-clip-text text-transparent">
              Your Entrepreneurial Journey
              <br />
              <span className="text-primary">Starts Here</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Connect with fellow entrepreneurs, share your victories and challenges, 
              learn from real experiences, and build meaningful relationships that fuel your success.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/login">
                <Button 
                  size="lg" 
                  className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Heart className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  Share Your Story
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-primary/30 hover:bg-primary/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Explore Community
                </Button>
              </Link>
            </div>
          </div>

          {/* Community Stats & Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-background/50 to-primary/5 border-primary/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-3">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">10,000+</div>
                <div className="text-sm text-muted-foreground">Active Entrepreneurs</div>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-background/50 to-secondary/5 border-primary/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-3">
                  <MessageCircle className="h-8 w-8 text-secondary" />
                </div>
                <div className="text-2xl font-bold text-secondary mb-1">25,000+</div>
                <div className="text-sm text-muted-foreground">Stories Shared</div>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-background/50 to-green-500/5 border-primary/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-3">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-500 mb-1">$50M+</div>
                <div className="text-sm text-muted-foreground">Revenue Generated</div>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-background/50 to-yellow-500/5 border-primary/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-3">
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-500 mb-1">95%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Value Propositions */}
          <div className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Real Experiences</h3>
                <p className="text-sm text-muted-foreground">Learn from genuine entrepreneur stories, not just theory</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/30 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Meaningful Connections</h3>
                <p className="text-sm text-muted-foreground">Build relationships with like-minded entrepreneurs worldwide</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/30 flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Proven Results</h3>
                <p className="text-sm text-muted-foreground">Join a community with a track record of entrepreneurial success</p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              <span>Global Community • Available 24/7 • Free to Join</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityHero;
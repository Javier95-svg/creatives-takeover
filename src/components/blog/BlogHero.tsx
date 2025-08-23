import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Rss, Sparkles } from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/hero-bg-animated.jpg";

const BlogHero = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be implemented when you add search functionality
    console.log("Searching for:", searchTerm);
  };

  return (
    <section className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background with Multiple Layers */}
      <div 
        className="absolute inset-0 bg-cover bg-center animate-pulse-glow"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Enhanced Animated Floating Elements with Diverse Movement Patterns */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80 hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
      <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{ animationDelay: '5s' }} />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full animate-float-reverse opacity-40" style={{ animationDelay: '6s' }} />
      
      {/* Additional Dynamic Floating Elements with Varied Animations */}
      <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full animate-drift opacity-80" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full animate-orbit opacity-70" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full animate-figure-eight opacity-50" style={{ animationDelay: '3.5s' }} />
      <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full animate-zigzag opacity-80" style={{ animationDelay: '4.5s' }} />
      <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-diagonal-float opacity-40" style={{ animationDelay: '5.5s' }} />
      <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full animate-float-reverse opacity-60" style={{ animationDelay: '6.5s' }} />
      
      {/* Moving Gradient Orbs with Complex Paths */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{ animationDelay: '7s' }} />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '8s' }} />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full animate-figure-eight opacity-35 blur-sm" style={{ animationDelay: '9s' }} />
      <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{ animationDelay: '10s' }} />
      
      {/* Additional Tiny Floating Particles */}
      <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full animate-drift opacity-90" style={{ animationDelay: '11s' }} />
      <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full animate-zigzag opacity-85" style={{ animationDelay: '12s' }} />
      <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full animate-orbit opacity-75" style={{ animationDelay: '13s' }} />
      <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full animate-spiral opacity-70" style={{ animationDelay: '14s' }} />

      <div className="container mx-auto px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-card mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Latest Business & AI Insights</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up takeover-title creatives-font">
            <span className="takeover-gradient">Insighta</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            A blog for builders and doers: dive into AI, smart business tips, and creative growth hacks to help you launch and scale your projects.
          </p>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto mb-8 animate-slide-up" 
            style={{ animationDelay: '0.4s' }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>
            <Button type="submit" className="glass bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic">
              Search
            </Button>
          </form>

          {/* RSS Feed */}
          <div className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <Button variant="ghost" className="glass-card btn-magnetic flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Rss className="w-4 h-4" />
              Subscribe to RSS Feed
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogHero;
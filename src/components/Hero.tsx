import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-float" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-card mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Business Transformation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">Creatives</span>{" "}
            <span className="text-foreground">Takeover</span>
            <br />
            <span className="text-xl md:text-3xl font-normal text-muted-foreground">
              From Idea to Execution – Let AI Handle the Grind
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Join our vibe coding community where we guide creators from idea to software. 
            Build powerful no-code applications and transform your concepts into reality.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg hover-lift">
              Join the Community
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="glass border-border hover:bg-accent/10 px-8 py-4 text-lg hover-lift">
              <Play className="mr-2 w-5 h-5" />
              See How It Works
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="glass-card hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">1000+</div>
              <div className="text-muted-foreground">Community Members</div>
            </div>
            <div className="glass-card hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">200+</div>
              <div className="text-muted-foreground">Apps Built Together</div>
            </div>
            <div className="glass-card hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">0</div>
              <div className="text-muted-foreground">Code Required</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
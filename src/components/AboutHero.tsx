import { Button } from "@/components/ui/button";
import teamHeroImage from "@/assets/team-hero.jpg";
import { ArrowRight } from "lucide-react";

const AboutHero = () => {
  return (
    <section className="relative pt-32 pb-20 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="floating-dots">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className={`floating-dot floating-dot-${(i % 8) + 1}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`,
              }}
            />
          ))}
        </div>
        
        {/* Enhanced Animated Floating Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
        <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{ animationDelay: '5s' }} />
        
        {/* Moving Gradient Orbs */}
        <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{ animationDelay: '7s' }} />
        <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '8s' }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
          <div className="space-y-8 animate-slide-up">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 gradient-text leading-tight animate-text-shimmer">
                About Creatives Takeover
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed font-poppins animate-fade-in" style={{ animationDelay: '0.2s' }}>
                We're a passionate team dedicated to empowering creators and solopreneurs 
                to bring their boldest ideas to life—without code, without limits.
              </p>
            </div>
              
            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Founded on the belief that everyone has the potential to create something extraordinary, 
                Creatives Takeover bridges the gap between imagination and implementation. We're not just 
                a platform—we're your creative partners on the journey from concept to launch.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Join thousands of creators who've discovered that the future belongs to those who dare to build it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="lg" 
                className="group bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic glass"
              >
                Meet Our Team
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="btn-magnetic glass border-border hover:bg-accent/10">
                Our Story
              </Button>
            </div>
            </div>

          {/* Hero Image */}
          <div className="relative animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl hover-lift">
              <img 
                src={teamHeroImage} 
                alt="Creatives Takeover team collaborating" 
                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent animate-pulse-glow" />
            </div>
              
            {/* Floating Stats with Enhanced Animations */}
            <div className="absolute -top-6 -right-6 bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border animate-float hover-lift">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-primary animate-pulse-glow">10K+</h3>
                <p className="text-sm text-muted-foreground">Creators Empowered</p>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border animate-float-reverse hover-lift" style={{ animationDelay: '2s' }}>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-primary animate-pulse-glow">500+</h3>
                <p className="text-sm text-muted-foreground">Apps Built</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHero;
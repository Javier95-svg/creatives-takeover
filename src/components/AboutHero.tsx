import { Button } from "@/components/ui/button";
import solopreneurHero from "@/assets/solopreneur-hero.jpg";
import solopreneurHeroMale from "@/assets/solopreneur-hero-male.jpg";
import solopreneurHeroAsianTeen from "@/assets/solopreneur-hero-asian-teen.jpg";
import solopreneurHeroSketch from "@/assets/solopreneur-hero-sketch.jpg";
import { ArrowRight } from "lucide-react";
const AboutHero = () => {
  return <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Animated Background with Multiple Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Enhanced Animated Floating Elements with Diverse Movement Patterns */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80 hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{
      animationDelay: '1s'
    }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{
      animationDelay: '2s'
    }} />
      <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{
      animationDelay: '3s'
    }} />
      <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{
      animationDelay: '4s'
    }} />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{
      animationDelay: '5s'
    }} />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full animate-float-reverse opacity-40" style={{
      animationDelay: '6s'
    }} />
      
      {/* Additional Dynamic Floating Elements with Varied Animations */}
      <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full animate-drift opacity-80" style={{
      animationDelay: '0.5s'
    }} />
      <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full animate-spiral opacity-60" style={{
      animationDelay: '1.5s'
    }} />
      <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full animate-orbit opacity-70" style={{
      animationDelay: '2.5s'
    }} />
      <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full animate-figure-eight opacity-50" style={{
      animationDelay: '3.5s'
    }} />
      <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full animate-zigzag opacity-80" style={{
      animationDelay: '4.5s'
    }} />
      <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-diagonal-float opacity-40" style={{
      animationDelay: '5.5s'
    }} />
      <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full animate-float-reverse opacity-60" style={{
      animationDelay: '6.5s'
    }} />
      
      {/* Moving Gradient Orbs with Complex Paths */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{
      animationDelay: '7s'
    }} />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{
      animationDelay: '8s'
    }} />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full animate-figure-eight opacity-35 blur-sm" style={{
      animationDelay: '9s'
    }} />
      <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{
      animationDelay: '10s'
    }} />
      
      {/* Additional Tiny Floating Particles */}
      <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full animate-drift opacity-90" style={{
      animationDelay: '11s'
    }} />
      <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full animate-zigzag opacity-85" style={{
      animationDelay: '12s'
    }} />
      <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full animate-orbit opacity-75" style={{
      animationDelay: '13s'
    }} />
      <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full animate-spiral opacity-70" style={{
      animationDelay: '14s'
    }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
          <div className="space-y-8 animate-slide-up">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 gradient-text leading-tight animate-text-shimmer">
                About Us
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed font-poppins animate-fade-in" style={{
                animationDelay: '0.2s'
              }}>Creatives Takeover is a platform that helps creatives and founders launch their startups faster with AI-powered workflows, automation, and no-code tools.</p>
            </div>
              
            <div className="space-y-4 animate-slide-up" style={{
              animationDelay: '0.4s'
            }}>
              <p className="text-lg text-muted-foreground leading-relaxed">Founded on the belief that everyone has the potential to create something extraordinary, our aim is to bridge the gap between imagination and implementation. We're not just a platform, we're your creative partners on the journey from concept to launch.</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{
              animationDelay: '0.6s'
            }}>
              <Button size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic glass">
                Learn More
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="btn-magnetic glass border-border hover:bg-accent/10">
                Our Story
              </Button>
            </div>
            </div>

          {/* Hero Image */}
          <div className="relative animate-slide-in-right" style={{
            animationDelay: '0.3s'
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img src={solopreneurHero} alt="Solopreneur building a startup in a modern workspace" className="w-full h-auto object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img src={solopreneurHeroMale} alt="African American solopreneur building a startup in a modern workspace" className="w-full h-auto object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img src={solopreneurHeroAsianTeen} alt="Teenage Asian boy solopreneur building a startup in a bright, modern workspace" className="w-full h-auto object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img src={solopreneurHeroSketch} alt="Solopreneur sketching app wireframes and product ideas at a startup desk" className="w-full h-auto object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>;
};
export default AboutHero;
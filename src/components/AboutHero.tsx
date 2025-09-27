
import solopreneurHero from "@/assets/solopreneur-hero.jpg";
import solopreneurHeroMale from "@/assets/solopreneur-hero-male.jpg";
import solopreneurHeroAsianTeen from "@/assets/solopreneur-hero-asian-teen.jpg";
import solopreneurHeroGrandpa from "@/assets/solopreneur-hero-grandpa.jpg";
import { ChevronDown } from "lucide-react";
const AboutHero = () => {
  return <section className="relative pt-32 pb-20 overflow-hidden">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Text Content */}
          <div className="space-y-6 sm:space-y-8 animate-slide-up order-2 lg:order-1">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 gradient-text leading-tight animate-text-shimmer">
                About Us
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed font-poppins animate-fade-in" style={{
                animationDelay: '0.2s'
              }}>Creatives Takeover is a platform that helps creatives and founders launch their startups faster with AI-powered workflows, automation, and no-code tools.</p>
            </div>
              
            <div className="space-y-3 sm:space-y-4 animate-slide-up" style={{
              animationDelay: '0.4s'
            }}>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">Founded on the belief that everyone has the potential to create something extraordinary, our aim is to bridge the gap between imagination and implementation. We're not just a platform, we're your creative partners on the journey from concept to launch.</p>
              
            </div>

            </div>

          {/* Hero Image */}
          <div className="relative animate-slide-in-right order-1 lg:order-2" style={{
            animationDelay: '0.3s'
          }}>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHero} alt="White woman solopreneur at a creative beach workspace, looking at her laptop with a gentle, natural smile under a colorful parasol" className="w-full h-auto object-cover aspect-square" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroMale} alt="African American solopreneur in an industrial loft studio with exposed brick and large windows" className="w-full h-auto object-cover aspect-square" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroAsianTeen} alt="Teenage Asian founder in a colorful Tokyo co-working space with plants and neon accents" className="w-full h-auto object-cover aspect-square" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroGrandpa} alt="Grandfather entrepreneur in a warm library-style study with wood shelves and a vintage lamp" className="w-full h-auto object-cover aspect-square" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
          </div>

          <div className="mt-6 sm:mt-10 flex justify-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <a href="#mission-vision" className="inline-flex items-center gap-2 text-muted-foreground hover-scale touch-manipulation" aria-label="Scroll to mission and vision">
              <span className="text-sm">Scroll</span>
              <ChevronDown className="h-4 sm:h-5 w-4 sm:w-5" />
            </a>
          </div>
          </div>
        </div>
        </div>
      </div>
    </section>;
};
export default AboutHero;

import solopreneurHero from "@/assets/solopreneur-hero.jpg";
import solopreneurHeroMale from "@/assets/solopreneur-hero-male.jpg";
import solopreneurHeroAsianTeen from "@/assets/solopreneur-hero-asian-teen.jpg";
import solopreneurHeroGrandpa from "@/assets/solopreneur-hero-grandpa.jpg";
import { ChevronDown } from "lucide-react";

const AboutHero = () => {
  return <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-14 items-stretch">
            {/* Text Content */}
          <div className="space-y-6 sm:space-y-8 order-2 lg:order-1 lg:flex lg:flex-col lg:justify-center lg:-translate-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.875rem] xl:text-[4.125rem] font-space-grotesk font-bold tracking-[-0.065em] mb-4 sm:mb-6 gradient-text leading-[1.02] animate-text-shimmer text-foreground">
                <span className="block lg:whitespace-nowrap">The Future Belongs</span>
                <span className="block lg:whitespace-nowrap">to Founders</span>
              </h1>
              <p className="text-sm sm:text-base font-medium tracking-[-0.01em] text-foreground/90 leading-relaxed">We're entering a world where AI and automation will eliminate most traditional jobs but also unlock unprecedented entrepreneurial opportunities. Everyone will need to think and act like a founder, and we're here to make that transition possible.</p>
            </div>
              
            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base font-medium tracking-[-0.01em] text-foreground/85 leading-relaxed">The biggest challenge is not coming up with ideas but moving them from scattered brainstorming into real execution. Creatives Takeover is The Founders' Compass: an AI startup builder that helps first-time founders validate, plan, build, launch, and prepare for fundraising.</p>
              <p className="text-sm sm:text-base font-medium tracking-[-0.01em] text-foreground/85 leading-relaxed">This isn't just a tool. It's an ecosystem designed for the next wave of builders who will define their own future instead of waiting for one to be handed to them.</p>
            </div>

            </div>

          {/* Hero Image */}
          <div className="relative animate-slide-in-right order-1 lg:order-2 lg:flex lg:flex-col lg:justify-center" style={{
            animationDelay: '0.3s'
          }}>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHero} alt="White woman solopreneur at a creative beach workspace, looking at her laptop with a gentle, natural smile under a colorful parasol" className="w-full h-auto object-cover aspect-square" loading="eager" decoding="async" fetchPriority="high" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroMale} alt="African American solopreneur in an industrial loft studio with exposed brick and large windows" className="w-full h-auto object-cover aspect-square" loading="lazy" decoding="async" fetchPriority="low" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroAsianTeen} alt="Teenage Asian founder in a colorful Tokyo co-working space with plants and neon accents" className="w-full h-auto object-cover aspect-square" loading="lazy" decoding="async" fetchPriority="low" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border">
                <img src={solopreneurHeroGrandpa} alt="Grandfather entrepreneur in a warm library-style study with wood shelves and a vintage lamp" className="w-full h-auto object-cover aspect-square" loading="lazy" decoding="async" fetchPriority="low" />
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

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Target, Eye } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import missionImg from "@/assets/innovation-leaders-unique.jpg";
import visionImg from "@/assets/innovation-leaders.jpg";
const MissionVision = () => {
  const [emblaApi, setEmblaApi] = useState<CarouselApi | null>(null);
  useEffect(() => {
    if (!emblaApi) return;
    let canceled = false;
    const tick = () => {
      if (canceled || !emblaApi) return;
      const idx = emblaApi.selectedScrollSnap();
      if (emblaApi.canScrollNext() && idx === 0) {
        emblaApi.scrollNext();
      } else if (emblaApi.canScrollPrev() && idx > 0) {
        emblaApi.scrollPrev();
      } else {
        emblaApi.scrollTo(idx === 0 ? 1 : 0);
      }
    };
    const interval = window.setInterval(tick, 20000);
    const cancel = () => {
      if (!canceled) {
        canceled = true;
        window.clearInterval(interval);
      }
    };
    emblaApi.on("pointerDown", cancel);
    emblaApi.on("scroll", cancel);
    return () => {
      window.clearInterval(interval);
      emblaApi.off("pointerDown", cancel);
      emblaApi.off("scroll", cancel);
    };
  }, [emblaApi]);
  return (
    <section className="relative py-20 overflow-hidden" id="mission-vision">
      {/* Animated Wallpaper Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient - forward-looking theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
        
        {/* Animated orbs representing vision and goals */}
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-gradient-to-br from-accent/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "5s" }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/3 w-56 h-56 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-2xl animate-pulse" style={{ animationDuration: "4.5s", animationDelay: "0.5s" }} />
        
        {/* Path lines - representing the journey forward */}
        <svg className="absolute inset-0 w-full h-full opacity-15">
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" opacity="0.3" />
            </marker>
          </defs>
          {/* Forward-moving paths with arrows */}
          <path d="M 10,50 Q 150,30 300,50 T 600,50" stroke="url(#pathGradient)" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" className="animate-pulse" style={{ animationDuration: "4s" }} />
          <path d="M 50,150 Q 200,120 400,150 T 800,150" stroke="url(#pathGradient)" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" className="animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
          <path d="M 20,300 Q 180,250 380,300 T 750,300" stroke="url(#pathGradient)" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" className="animate-pulse" style={{ animationDuration: "4.5s", animationDelay: "0.5s" }} />
        </svg>
        
        {/* Target circles - representing goals and vision */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`target-${i}`}
            className="absolute border-2 border-primary/20 rounded-full animate-pulse"
            style={{
              top: `${20 + i * 25}%`,
              right: `${10 + i * 15}%`,
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              animationDuration: `${3 + i}s`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        
        {/* Floating particles - representing progress and movement */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-accent/30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2.5 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/75 to-background/90" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Our Mission & Vision</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Driven by purpose and guided by vision; discover what makes Creatives Takeover unique
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <Carousel className="mb-10" opts={{ loop: false, align: "start" }} setApi={setEmblaApi}>
            <CarouselContent>
              <CarouselItem>
                <Card className="glass border-border overflow-hidden">
                  <div className="grid md:grid-cols-2">
                    <figure className="relative">
                      <img
                        src={missionImg}
                        alt="Creators using AI tools to launch startups quickly"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
                    </figure>
                    <div className="p-6 md:p-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold">Our Mission</h3>
                      </div>
                      <div className="space-y-4 text-muted-foreground">
                        <p className="text-base leading-relaxed text-foreground/90">
                          Our mission is to empower anyone, anywhere, to launch their own startup by making advanced AI automation tools accessible, affordable, and easy to use.
                        </p>
                        <p className="text-base leading-relaxed">
                          We believe entrepreneurship should not be limited by technical skills, financial barriers, or location. By combining cutting-edge AI with intuitive workflows, we aim to streamline every stage of the startup journey, from idea validation and market research to branding, product development, and launch, so individuals can focus on innovation and creativity.
                        </p>
                        <p className="text-base leading-relaxed">
                          We envision a world where any person with an idea can bring it to life in record time, supported by intelligent automation that reduces costs, accelerates progress, and removes complexity. Through our platform, we strive to democratize startup creation and ignite a new wave of diverse, AI-powered businesses that drive economic growth and positive change.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </CarouselItem>

              <CarouselItem>
                <Card className="glass border-border overflow-hidden">
                  <div className="grid md:grid-cols-2">
                    <figure className="relative order-first md:order-none">
                      <img
                        src={visionImg}
                        alt="Future-facing creative technology empowering global founders"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
                    </figure>
                    <div className="p-6 md:p-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Eye className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold">Our Vision</h3>
                      </div>
                      <div className="space-y-4 text-muted-foreground">
                        <p className="text-base leading-relaxed">
                          Today, entrepreneurship is undergoing a fundamental shift driven by the rapid rise of AI. Recent advancements in generative AI, automation, and no-code tools are enabling founders to validate ideas, create products, and reach global markets at unprecedented speed and scale.
                        </p>
                        <p className="text-base leading-relaxed text-foreground/90">
                          This evolution is dismantling the old barriers to entry and creating a new era where innovation is limited only by imagination, not resources.
                        </p>
                        <p className="text-base leading-relaxed">
                          We envision a future where entrepreneurship is as universal as ambition where anyone with an idea, regardless of background, education, or resources, can turn it into a thriving business. By fully unlocking the potential of AI automation, we aim to remove the barriers that have traditionally limited startup creation: high costs, technical complexity, and access to expert knowledge.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

      </div>
    </section>
  );
};

export default MissionVision;
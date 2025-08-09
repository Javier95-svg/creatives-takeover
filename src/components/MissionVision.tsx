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
    const timer = window.setTimeout(() => {
      if (!canceled) emblaApi.scrollTo(1);
    }, 14000);
    const cancel = () => {
      if (!canceled) {
        canceled = true;
        window.clearTimeout(timer);
      }
    };
    emblaApi.on("pointerDown", cancel);
    emblaApi.on("scroll", cancel);
    return () => {
      window.clearTimeout(timer);
      emblaApi.off("pointerDown", cancel);
      emblaApi.off("scroll", cancel);
    };
  }, [emblaApi]);
  return (
    <section className="py-20 bg-background/50" id="mission-vision">
      <div className="container mx-auto px-6">
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
                        <p className="text-base leading-relaxed">
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
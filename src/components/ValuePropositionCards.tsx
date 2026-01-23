import { Lightbulb, Users, Rocket, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  // Core value propositions - condensed to 4 essential offerings
  const allCards = [
    {
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop&q=80",
      imageAlt: "AI-powered business planning and strategy visualization"
    },
    {
      icon: Users,
      title: "CONNECT",
      subtitle: "Community",
      description: "Connect with vetted startup mentors and coaches. Get hands-on guidance, actionable feedback on your roadmap and pitch, and practical support to accelerate your startup growth from idea to funding.",
      cta: "Join Community",
      link: "/community",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop&q=80",
      imageAlt: "Team collaboration and community networking"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business growth. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80",
      imageAlt: "Analytics dashboard and productivity tracking"
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta/test",
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop&q=80",
      imageAlt: "Startup fundraising and investment growth"
    }
  ];

  return (
    <section id="what-you-get" className="py-20 lg:py-28 scroll-mt-24 font-poppins">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight">
            Here's What You Get
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground">
            Everything you need to go from idea to launch. Four core tools designed for creative entrepreneurs who want to build real, sustainable businesses.
          </p>
        </div>

        {/* Large Cards */}
        <div className="space-y-8 max-w-5xl mx-auto">
          {allCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="glass border-border overflow-hidden"
              >
                <div className="grid md:grid-cols-2">
                  {/* Image - Left */}
                  <figure className="relative h-64 md:h-auto md:min-h-[320px]">
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
                  </figure>

                  {/* Content - Right */}
                  <div className="p-6 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {card.title}
                        </p>
                        <h3 className="font-space-grotesk text-2xl font-bold">
                          {card.subtitle}
                        </h3>
                      </div>
                    </div>

                    <p className="text-base leading-relaxed text-foreground/85 mb-6">
                      {card.description}
                    </p>

                    <Button variant="outline" className="w-fit" asChild>
                      <Link to={card.link}>{card.cta}</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionCards;

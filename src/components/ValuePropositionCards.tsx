import { Lightbulb, Users, Rocket, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
      link: "/bizmap-ai"
    },
    {
      icon: Users,
      title: "CONNECT",
      subtitle: "Community",
      description: "Connect with vetted startup mentors and coaches. Get hands-on guidance, actionable feedback on your roadmap and pitch, and practical support to accelerate your startup growth from idea to funding.",
      cta: "Join Community",
      link: "/community"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business growth. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard"
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta/test"
    }
  ];

  return (
    <section id="what-you-get" className="py-20 lg:py-28 scroll-mt-24 font-poppins">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight">
            Everything you need to go from idea to launch
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground">
            Four core tools that keep planning, execution, and fundraising in one clean workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {allCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="h-full border-border/70 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {card.title}
                      </p>
                      <h3 className="font-space-grotesk text-lg font-medium">
                        {card.subtitle}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {card.description}
                  </p>

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={card.link}>{card.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionCards;

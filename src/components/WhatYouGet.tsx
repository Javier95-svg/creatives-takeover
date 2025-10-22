import { CheckCircle2, FileText, Users, Calendar, Lightbulb, TrendingUp } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const WhatYouGet = () => {
  const deliverables = [
    {
      icon: FileText,
      title: "Your Personalized 30-Day Roadmap",
      description: "Custom action plan broken down into daily tasks, tailored to your creative business idea and current skill level.",
      preview: "Day 1: Validate idea with 10 potential customers | Day 7: First MVP design complete | Day 15: Landing page live"
    },
    {
      icon: CheckCircle2,
      title: "Daily Action Items with Accountability",
      description: "Clear, manageable tasks with progress tracking and automated reminders to keep you on track.",
      preview: "Today: Interview 3 potential customers | Tomorrow: Draft pricing structure | This week: Set up payment system"
    },
    {
      icon: TrendingUp,
      title: "Market Research Report for Your Niche",
      description: "AI-powered competitive analysis, pricing insights, and audience research specific to your creative industry.",
      preview: "142 competitors analyzed | $47 average price point | 3 untapped market gaps identified"
    },
    {
      icon: Users,
      title: "Matched Accountability Partner",
      description: "Paired with another creative entrepreneur at a similar stage for weekly check-ins and mutual support.",
      preview: "Matched with Sarah (Product Designer) | 89% compatibility | Weekly video check-ins scheduled"
    },
    {
      icon: Calendar,
      title: "Access to Monthly Demo Day",
      description: "Present your progress to the community, get feedback, and celebrate wins with fellow creatives.",
      preview: "Next Demo Day: March 15 | 43 creatives presenting | Live feedback from community"
    },
    {
      icon: Lightbulb,
      title: "Community of 15,000+ Creatives",
      description: "Connect with designers, writers, photographers, and artists who are all building real businesses.",
      preview: "347 active today | 52 launches this month | 24/7 support channel"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
              What You'll Actually Get
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Launch
          </h2>
          <p className="text-lg text-muted-foreground">
            Not vague advice or generic templates. Real tools, real support, and a real plan to get you from idea to first dollar in 30 days.
          </p>
        </div>

        {/* Deliverables Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {deliverables.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="mb-4 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground mb-4 text-sm">{item.description}</p>
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted-foreground font-mono">{item.preview}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Plus access to all platform features, templates, and resources as we continue building
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhatYouGet;

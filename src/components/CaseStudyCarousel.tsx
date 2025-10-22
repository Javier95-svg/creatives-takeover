import { Card, CardContent } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { CheckCircle2, TrendingUp, Calendar, DollarSign } from "lucide-react";

const CaseStudyCarousel = () => {
  const caseStudies = [
    {
      name: "Sarah Chen",
      role: "Freelance Designer",
      image: "/lovable-uploads/6e837c16-b2d4-400c-b8ab-b4726c162660.png",
      before: "Overwhelmed with client work, no time to build products",
      after: "$5K/month design template business",
      timeline: "30 days",
      usedFeatures: ["AI Roadmap", "Sprint Planning", "Market Research"],
      result: "Launched Canva template bundle, got first 50 customers in 3 weeks",
      stats: [
        { label: "Revenue", value: "$5,247", icon: DollarSign },
        { label: "Time to Launch", value: "28 days", icon: Calendar },
        { label: "Customer Growth", value: "+185%", icon: TrendingUp }
      ]
    },
    {
      name: "Marcus Williams",
      role: "Content Creator & Photographer",
      image: "/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png",
      before: "10K followers but no monetization strategy",
      after: "Wedding photography booking system with 12 pre-bookings",
      timeline: "21 days",
      usedFeatures: ["Dream2Plan", "Accountability Partner", "Community Demo Day"],
      result: "Built automated booking system, presented at Demo Day, got first clients",
      stats: [
        { label: "Pre-bookings", value: "$18K", icon: DollarSign },
        { label: "Launch Speed", value: "21 days", icon: Calendar },
        { label: "Conversion Rate", value: "4.2%", icon: TrendingUp }
      ]
    },
    {
      name: "Alex Rivera",
      role: "Digital Artist",
      image: "/lovable-uploads/d357ca7d-d986-499b-b11a-7254722152ac.png",
      before: "Art skills but no business direction",
      after: "Print-on-demand store with consistent sales",
      timeline: "25 days",
      usedFeatures: ["Market Analysis", "Sprint Tasks", "Community Support"],
      result: "Validated niche (minimalist pet portraits), launched store, first sale in 48hrs",
      stats: [
        { label: "First Month", value: "$2,890", icon: DollarSign },
        { label: "To First Sale", value: "2 days", icon: Calendar },
        { label: "Order Volume", value: "+320%", icon: TrendingUp }
      ]
    },
    {
      name: "Priya Patel",
      role: "Copywriter & Strategist",
      image: "/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png",
      before: "Trading time for money with hourly rates",
      after: "Productized copywriting packages at 3x revenue",
      timeline: "19 days",
      usedFeatures: ["Pricing Strategy", "Package Builder", "Launch Checklist"],
      result: "Created 3 fixed-price packages, automated onboarding, tripled income",
      stats: [
        { label: "Revenue Growth", value: "+312%", icon: TrendingUp },
        { label: "Implementation", value: "19 days", icon: Calendar },
        { label: "Client Capacity", value: "5x more", icon: CheckCircle2 }
      ]
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
              See It In Action
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Real Creatives, Real Results
          </h2>
          <p className="text-lg text-muted-foreground">
            These aren't hypothetical case studies. These are actual creatives who used our platform to go from scattered ideas to profitable businesses in under 30 days.
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {caseStudies.map((study, index) => (
                <CarouselItem key={index}>
                  <Card className="border-2">
                    <CardContent className="p-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        {/* Left Column - Story */}
                        <div>
                          <div className="flex items-center gap-4 mb-6">
                            <img 
                              src={study.image} 
                              alt={study.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                            />
                            <div>
                              <h3 className="font-bold text-xl">{study.name}</h3>
                              <p className="text-sm text-muted-foreground">{study.role}</p>
                            </div>
                          </div>

                          <div className="space-y-4 mb-6">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Before</div>
                              <p className="text-sm text-muted-foreground">{study.before}</p>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-primary uppercase mb-1">After {study.timeline}</div>
                              <p className="text-lg font-semibold">{study.after}</p>
                            </div>
                          </div>

                          <div className="bg-muted/50 rounded-lg p-4 border border-border">
                            <p className="text-sm">{study.result}</p>
                          </div>
                        </div>

                        {/* Right Column - Features & Stats */}
                        <div>
                          <div className="mb-6">
                            <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Features Used</div>
                            <div className="flex flex-wrap gap-2">
                              {study.usedFeatures.map((feature, idx) => (
                                <span 
                                  key={idx}
                                  className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Key Metrics</div>
                            {study.stats.map((stat, idx) => {
                              const Icon = stat.icon;
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-primary" />
                                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                                  </div>
                                  <span className="font-bold text-lg">{stat.value}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span>Verified launch with community Demo Day presentation</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Join 15,000+ creatives who are building real businesses, not just dreaming about them
          </p>
        </div>
      </div>
    </section>
  );
};

export default CaseStudyCarousel;

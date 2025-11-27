import { 
  Zap, 
  Brain, 
  Users, 
  Target, 
  Shield, 
  Layers 
} from "lucide-react";

const reasons = [
  {
    icon: Zap,
    title: "No More Planning Paralysis",
    description: "Get from idea to actionable plan in days, not months. Our AI helps you move fast instead of getting stuck in endless planning.",
  },
  {
    icon: Brain,
    title: "AI Built for Creatives",
    description: "Understanding creative business models without corporate jargon. Built by founders who know what it's actually like to launch.",
  },
  {
    icon: Users,
    title: "Real Accountability",
    description: "Daily check-ins and partner support to keep you shipping. No ghosting—just consistent progress toward your goals.",
  },
  {
    icon: Target,
    title: "Validate Before Building",
    description: "Market intelligence to test ideas before investing time or money. Know what works before you commit resources.",
  },
  {
    icon: Shield,
    title: "Community That Gets It",
    description: "Connect with other creative entrepreneurs facing similar challenges. Get honest feedback and real support.",
  },
  {
    icon: Layers,
    title: "All-in-One Toolkit",
    description: "Planning, execution tracking, community, and funding resources in one place. Everything you need without the chaos.",
  },
];

const WhyFoundersChooseUs = () => {
  return (
    <section id="why-founders-choose-us" className="scroll-mt-24 py-20 relative overflow-hidden">
      {/* Wallpaper Background - matching Meet the Team sober style */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        
        {/* Simple subtle circles */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background/90" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <header className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
          <h2 className="text-5xl font-bold mb-4 gradient-text animate-text-shimmer animate-fade-in leading-relaxed pb-2">
            Why Founders Choose Us
          </h2>
          <p className="text-lg text-foreground/85 leading-relaxed">
            A concise overview of why founders choose Creatives Takeover, highlighting practical benefits, standout features, and the real problems we help them solve.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map(({ icon: Icon, title, description }, index) => (
            <article 
              key={title} 
              className="glass border-border/60 p-6 h-full group relative overflow-hidden animate-fade-in transition-all duration-500 hover:shadow-xl hover:shadow-primary/10"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                  {title}
                </h3>
                
                <p className="text-sm text-foreground/85 leading-relaxed group-hover:text-foreground/90 transition-colors duration-300">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyFoundersChooseUs;

import { Map, Users, Target, Rocket, Lightbulb, LayoutDashboard } from "lucide-react";

const EntrepreneurProblems = () => {
  // Timeline items representing the founder's journey with bottlenecks and pathways
  const journeySteps = [
    {
      phase: "The Starting Point",
      challenge: "Scattered ideas without a clear direction",
      insight: "Most founders start with excitement but lack a structured roadmap to validate and execute their vision.",
      pathway: "BizMap AI guides you from scattered thoughts to a strategic plan—clarifying your market, competitors, and next steps in one conversation.",
      icon: Lightbulb,
      accentColor: "blue", // Planning
    },
    {
      phase: "Finding Direction",
      challenge: "Weak execution habits and constant distractions",
      insight: "Without clear priorities and accountability, even great ideas fade into endless to-do lists with no tangible progress.",
      pathway: "The Dashboard breaks down your vision into weekly sprints, tracks progress, and keeps you accountable—transforming busyness into real momentum.",
      icon: Target,
      accentColor: "green", // Execution/Growth
    },
    {
      phase: "Building Alone",
      challenge: "Network limitations and lack of guidance",
      insight: "Going solo means missing crucial insights, struggling with decisions, and facing the emotional weight without support.",
      pathway: "Our Community connects you with mentors and fellow founders who've navigated these exact challenges—offering guidance, feedback, and genuine support.",
      icon: Users,
      accentColor: "red", // Action/Connection
    },
    {
      phase: "Scaling Strategy",
      challenge: "Go-to-market confusion and customer uncertainty",
      insight: "Many founders waste time and resources on the wrong channels, unsure how to reach their ideal customers effectively.",
      pathway: "BizMap AI helps define your ICP, select the right channels, and craft a go-to-market strategy based on proven frameworks—no more guessing.",
      icon: Map,
      accentColor: "blue", // Planning
    },
    {
      phase: "Seeking Resources",
      challenge: "Fundraising feels impossible without the right connections",
      insight: "Finding the right investors is like finding a needle in a haystack—wasting time on pitches that were never going to work.",
      pathway: "Insighta surfaces relevant accelerators, grants, and investors matched to your stage and industry—helping you connect with the right opportunities.",
      icon: Rocket,
      accentColor: "amber", // Fundraising
    },
    {
      phase: "Sustaining Growth",
      challenge: "Burnout and lost momentum threaten progress",
      insight: "The founder journey is emotionally taxing—early excitement fades, and isolation amplifies every setback.",
      pathway: "Daily check-ins on the Dashboard and peer support in the Community help you maintain momentum, celebrate wins, and push through tough moments.",
      icon: LayoutDashboard,
      accentColor: "green", // Growth/Success
    },
  ];

  const getAccentClasses = (color: string) => {
    const classes = {
      blue: {
        icon: "bg-primary/10 border-primary/30 text-primary",
        timeline: "bg-primary/20",
        glow: "shadow-primary/20",
      },
      red: {
        icon: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
        timeline: "bg-red-500/20",
        glow: "shadow-red-500/20",
      },
      green: {
        icon: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
        timeline: "bg-green-500/20",
        glow: "shadow-green-500/20",
      },
      amber: {
        icon: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
        timeline: "bg-amber-500/20",
        glow: "shadow-amber-500/20",
      },
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <section className="py-20 lg:py-32 relative overflow-visible" aria-labelledby="journey-heading">
      {/* Subtle red accent aligned with infographic gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 max-w-4xl mx-auto">
          <h2 id="journey-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight">
            <span className="gradient-unified">Every Founder's Journey is Unique</span>
          </h2>
          <p className="text-lg sm:text-xl text-foreground/75 leading-[1.7] font-light">
            But some challenges are universal. Here's how we clear founders' path, removing bottlenecks at every stage.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Timeline Line - Continuous vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-red-500/20 to-green-500/30 hidden sm:block" />

          {/* Timeline Items */}
          <div className="space-y-12 md:space-y-16">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const accentClasses = getAccentClasses(step.accentColor);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Mobile Layout (Stacked) */}
                  <div className="md:hidden flex gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${accentClasses.icon} shadow-lg ${accentClasses.glow} transition-all duration-300 hover:scale-110`}>
                        <Icon className="w-7 h-7" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <div className="mb-2">
                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                          {step.phase}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-foreground">
                        {step.challenge}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {step.insight}
                      </p>
                      <div className="p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          <span className="font-semibold text-foreground">Your path forward: </span>
                          {step.pathway}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout (Alternating) */}
                  <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                    {/* Left Side Content (for even indexes) */}
                    {isEven && (
                      <div className="text-right pr-12">
                        <div className="mb-3 flex justify-end">
                          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                            {step.phase}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-foreground">
                          {step.challenge}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                          {step.insight}
                        </p>
                        <div className="p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 text-left">
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            <span className="font-semibold text-foreground">Your path forward: </span>
                            {step.pathway}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Center Icon */}
                    <div className="flex justify-center relative z-10">
                      <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${accentClasses.icon} shadow-lg ${accentClasses.glow} bg-background transition-all duration-300 hover:scale-110`}>
                        <Icon className="w-9 h-9" />
                      </div>
                    </div>

                    {/* Right Side Content (for odd indexes) */}
                    {!isEven ? (
                      <div className="pl-12">
                        <div className="mb-3">
                          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                            {step.phase}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-foreground">
                          {step.challenge}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                          {step.insight}
                        </p>
                        <div className="p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            <span className="font-semibold text-foreground">Your path forward: </span>
                            {step.pathway}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div /> // Empty div to maintain grid structure
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 sm:mt-20">
          <p className="text-lg sm:text-xl text-foreground/75 max-w-3xl mx-auto leading-[1.7] font-light">
            We're not here to sell you tools—we're here to clear the bottlenecks that slow founders down. Your journey is unique, but you don't have to navigate it alone.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;

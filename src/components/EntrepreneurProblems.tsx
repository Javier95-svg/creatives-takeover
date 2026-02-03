import { Map, Users, Target, Rocket, Lightbulb, LayoutDashboard, Bot, Handshake, Code, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import FounderJourneyVideo from "./FounderJourneyVideo";

const EntrepreneurProblems = () => {
  // Timeline items representing the founder's journey with bottlenecks and pathways
  const journeySteps = [
    {
      phase: "The Starting Point",
      challenge: "Scattered ideas without a clear direction",
      insight: "Founders often face a flood of ideas but struggle to prioritize or organize them into a clear plan. This lack of focus leads to confusion, indecision, and slow progress, as they bounce between concepts without a unified strategy, making it difficult to move the business forward. Without a clear roadmap, they risk losing momentum and missing key opportunities that are critical for growth.",
      pathway: "BizMap AI guides you from scattered thoughts to a strategic plan—clarifying your market, competitors, and next steps in one conversation.",
      icon: Lightbulb,
      accentColor: "blue", // Planning
    },
    {
      phase: "Finding Direction",
      challenge: "Aligning your product with a genuine market need",
      insight: "Founders frequently build products based on assumptions, only to face the harsh reality of limited market demand, which leads to wasted resources and a high risk of building something nobody is willing to buy. To avoid this, it's crucial to validate ideas early through market research and customer feedback, ensuring the product aligns with real needs and demands.",
      pathway: "The Dashboard breaks down your vision into weekly sprints, tracks progress, and keeps you accountable—transforming busyness into real momentum.",
      icon: Target,
      accentColor: "green", // Execution/Growth
    },
    {
      phase: "Lack of Experience",
      challenge: "Navigating Uncertainty and Decision-Making",
      insight: "Early-stage founders often find themselves in situations with limited information and high uncertainty. This makes decision-making difficult, as they must navigate unknowns while balancing short-term survival with long-term vision. A mentor can help provide perspective and guidance on key decisions, like product direction, market fit, or hiring, based on their own experience.",
      pathway: "Our Community connects you with mentors and fellow founders who've navigated these exact challenges—offering guidance, feedback, and genuine support.",
      icon: Users,
      accentColor: "red", // Action/Connection
    },
    {
      phase: "Working Smartly",
      challenge: "Task prioritization and resources management",
      insight: "80% of results come from 20% of effort. Many founders get lost in low-impact tasks that take them nowhere, struggling to prioritize effectively. Proper task prioritization and resource management help focus energy on what truly drives progress, ensuring time and resources are used wisely.",
      pathway: "BizMap AI helps define your ICP, select the right channels, and craft a go-to-market strategy based on proven frameworks—no more guessing.",
      icon: Map,
      accentColor: "blue", // Planning
    },
    {
      phase: "Seeking Resources",
      challenge: "Fundraising feels impossible without the right connections",
      insight: "Founders often struggle to get in front of the right investors, relying on cold outreach that leads to limited results. Building a strong network and leveraging referrals can make all the difference in securing the right funding. A well-connected founder not only gains access to capital but also valuable mentorship and strategic partnerships that can accelerate growth.",
      pathway: "Explore VC Search",
      icon: Rocket,
      accentColor: "amber", // Fundraising
    },
    {
      phase: "Tech Stack Selection",
      challenge: "The Teck Stack Dilemma",
      insight: "Founders struggle to choose the right tech stack because they're making long-term, high-impact decisions at the earliest and most uncertain stage of their company. They're expected to move fast and build something credible without yet knowing their real product requirements, scale, or team needs, while facing an overwhelming number of tools and loud, conflicting opinions.",
      pathway: "Build your Tech Stack",
      icon: Code,
      accentColor: "blue", // Planning/Technical
    },
    {
      phase: "Founder's Mental Tax",
      challenge: "High chance of burnout",
      insight: "Founders often find themselves juggling multiple roles, neglecting self-care, and facing a never-ending to-do list, which can lead to physical and mental exhaustion. Without addressing this, their ability to lead effectively and make sound decisions is compromised, hindering the growth and success of their business.",
      pathway: "Find a Co-Founder",
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
    <section className="py-20 lg:py-28 relative font-poppins" aria-labelledby="journey-heading">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 max-w-4xl mx-auto">
          <h2 id="journey-heading" className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 leading-tight tracking-tight text-primary">
            Every Founder's Journey is Unique
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground leading-relaxed">
            But some challenges are universal. Here, we highlight some of the most common obstacles founders face and how we assist to overcome them.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Timeline Line - Continuous vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border hidden sm:block" />

          {/* Timeline Items */}
          <div className="space-y-12 md:space-y-16">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const accentClasses = getAccentClasses(step.accentColor);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className="relative"
                >
                  {/* Mobile Layout (Stacked) */}
                  <div className="md:hidden flex gap-6">
                    {/* Icon or Video */}
                    <div className={index === 0 || index === 1 || index === 2 || index === 3 || index === 4 || index === 5 || index === 6 ? "w-full" : "flex-shrink-0"}>
                      {index === 0 ? (
                        <FounderJourneyVideo position={0} />
                      ) : index === 1 ? (
                        <FounderJourneyVideo position={1} />
                      ) : index === 2 ? (
                        <FounderJourneyVideo position={2} />
                      ) : index === 3 ? (
                        <FounderJourneyVideo position={3} />
                      ) : index === 4 ? (
                        <FounderJourneyVideo position={4} />
                      ) : index === 5 ? (
                        <FounderJourneyVideo position={5} />
                      ) : index === 6 ? (
                        <FounderJourneyVideo position={6} />
                      ) : (
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm transition-colors`}>
                          <Icon className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <div className="mb-2 flex justify-center">
                        <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                          {step.phase}
                        </span>
                      </div>
                      <h3 className={`font-space-grotesk text-xl font-semibold mb-3 text-foreground ${index === 0 ? 'whitespace-nowrap' : ''} ${index === 2 || index === 4 ? 'text-left' : ''} ${index === 5 || index === 6 ? 'text-center' : ''}`}>
                        {step.challenge}
                      </h3>
                      <p className={`text-sm text-muted-foreground mb-4 leading-relaxed ${index === 0 || index === 4 || index === 6 ? 'text-left' : ''}`}>
                        {step.insight}
                      </p>
                      {index === 0 ? (
                        <div className="flex justify-center">
                          <Link
                            to="/icp-builder"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              Define your Niche <Target className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 1 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/pmf-lab" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              Try PMF Lab <FlaskConical className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 2 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/community" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              Find a Mentor <Users className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 3 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/dashboard" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              <LayoutDashboard className="h-5 w-5" /> Explore Dashboard
                            </span>
                          </Link>
                        </div>
                      ) : index === 4 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/insighta/vc-search" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              {step.pathway} <Rocket className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 5 ? (
                        <div className="flex justify-center">
                          <Link
                            to="/tech-stack"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              {step.pathway} <Code className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 6 ? (
                        <div className="flex justify-center">
                          <Link
                            to="/community/co-founders"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                              {step.pathway} <Handshake className="h-5 w-5" />
                            </span>
                          </Link>
                        </div>
                      ) : (
                        <div className="rounded-md border border-border bg-background/80 p-4">
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {step.pathway}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout (Alternating) */}
                  <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                    {/* Left Side Content (for even indexes) */}
                    {isEven && (
                      <div className={`${index === 0 ? 'pr-20' : 'pr-12'} ${index === 2 ? 'text-left' : 'text-right'}`}>
                        <div className="mb-3 flex justify-center">
                          <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                            {step.phase}
                          </span>
                        </div>
                        <h3 className={`font-space-grotesk text-2xl font-semibold mb-4 text-foreground ${index === 0 ? 'whitespace-nowrap' : ''} ${index === 2 || index === 4 ? 'text-left' : ''} ${index === 5 || index === 6 ? 'text-center' : ''}`}>
                          {step.challenge}
                        </h3>
                        <p className={`text-sm text-muted-foreground mb-5 leading-relaxed ${index === 0 || index === 4 || index === 6 ? 'text-left' : ''}`}>
                          {step.insight}
                        </p>
                        {index === 0 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/icp-builder"
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Define your Niche <Target className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 1 ? (
                          <div className="flex justify-center">
                            <Link 
                            to="/pmf-lab" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Try PMF Lab <FlaskConical className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 2 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Find a Mentor <Users className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 3 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/dashboard" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                <LayoutDashboard className="h-5 w-5" /> Explore Dashboard
                              </span>
                            </Link>
                          </div>
                        ) : index === 4 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/insighta/vc-search" 
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Rocket className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 5 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/tech-stack"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Code className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 6 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/community/co-founders"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Handshake className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : (
                          <div className="rounded-md border border-border bg-background/80 p-4">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {step.pathway}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Center Icon or Video (for all rows with GIF frames) */}
                    <div className="flex justify-center relative z-10">
                      {index === 0 ? (
                        /* GIF Frame for First Row */
                        <div className="w-full max-w-4xl ml-4">
                          <FounderJourneyVideo position={0} />
                        </div>
                      ) : index === 1 ? (
                        /* GIF Frame for Second Row */
                        <div className="w-full max-w-4xl mr-4">
                          <FounderJourneyVideo position={1} />
                        </div>
                      ) : index === 2 ? (
                        /* GIF Frame for Third Row */
                        <div className="w-full max-w-4xl ml-4">
                          <FounderJourneyVideo position={2} />
                        </div>
                      ) : index === 3 ? (
                        /* GIF Frame for Fourth Row */
                        <div className="w-full max-w-4xl mr-4">
                          <FounderJourneyVideo position={3} />
                        </div>
                      ) : index === 4 ? (
                        /* GIF Frame for Fifth Row */
                        <div className="w-full max-w-4xl ml-4">
                          <FounderJourneyVideo position={4} />
                        </div>
                      ) : index === 5 ? (
                        /* GIF Frame for Sixth Row */
                        <div className="w-full max-w-4xl mr-4">
                          <FounderJourneyVideo position={5} />
                        </div>
                      ) : index === 6 ? (
                        /* GIF Frame for Seventh Row */
                        <div className="w-full max-w-4xl ml-4">
                          <FounderJourneyVideo position={6} />
                        </div>
                      ) : (
                        /* Regular Icon for Other Rows */
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm bg-background transition-colors`}>
                          <Icon className="w-9 h-9" />
                        </div>
                      )}
                    </div>

                      {/* Right Side Content (for odd indexes) */}
                      {!isEven ? (
                      <div className={index === 1 ? 'pl-20' : 'pl-12'}>
                        <div className="mb-3 flex justify-center">
                          <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                            {step.phase}
                          </span>
                        </div>
                        <h3 className={`font-space-grotesk text-2xl font-semibold mb-4 text-foreground ${index === 0 ? 'whitespace-nowrap' : ''} ${index === 2 || index === 4 ? 'text-left' : ''} ${index === 5 || index === 6 ? 'text-center' : ''}`}>
                          {step.challenge}
                        </h3>
                        <p className={`text-sm text-muted-foreground mb-5 leading-relaxed ${index === 4 || index === 6 ? 'text-left' : ''}`}>
                          {step.insight}
                        </p>
                        {index === 0 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/icp-builder"
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Define your Niche <Target className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 1 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/pmf-lab" 
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Try PMF Lab <FlaskConical className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 2 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community" 
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                Find a Mentor <Users className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 3 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/dashboard" 
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                <LayoutDashboard className="h-5 w-5" /> Explore Dashboard
                              </span>
                            </Link>
                          </div>
                        ) : index === 4 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/insighta/vc-search" 
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Rocket className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 5 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/tech-stack"
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Code className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 6 ? (
                          <div className="flex justify-center">
                            <Link
                              to="/community/co-founders"
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-base">
                                {step.pathway} <Handshake className="h-5 w-5" />
                              </span>
                            </Link>
                          </div>
                        ) : (
                          <div className="rounded-md border border-border bg-background/80 p-4">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {step.pathway}
                            </p>
                          </div>
                        )}
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

      </div>
    </section>
  );
};

export default EntrepreneurProblems;



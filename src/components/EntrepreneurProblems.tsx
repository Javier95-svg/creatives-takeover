import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import { CharacterIntro } from "@/components/storytelling/CharacterIntro";
import { ScenarioHeader } from "@/components/storytelling/ScenarioHeader";
import { EmotionalIndicator } from "@/components/storytelling/EmotionalIndicator";
import { JourneyMap } from "@/components/storytelling/JourneyMap";

const EntrepreneurProblems = () => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const problems = [
    {
      beforeIcon: Search,
      afterIcon: CheckCircle,
      problem: "Building Without Validating",
      storyHook: "Sarah spent 8 months building her SaaS MVP. Launch day arrived. She sent 200 emails, posted in 15 communities, and got... 3 signups.",
      character: {
        name: "Sarah",
        context: "First-time founder, SaaS idea, 8 months in",
        emotion: "frustrated"
      },
      scenario: "It's launch day. Your savings are down 60%. You've been working nights and weekends. You're exhausted, and the silence is deafening.",
      struggle: "Every rejection feels like a personal judgment. You're questioning if you're cut out for this. The runway is shrinking, and you don't know what to fix first.",
      moment: "The moment you realize you've been building in a vacuum—solving a problem you assumed existed, for people you never actually talked to.",
      beforeText: "Spending months building an MVP without validating demand, watching savings disappear with no clear direction.",
      afterText: "Validate your idea with BizMap AI's 7-question framework before committing months to a build.",
      detail: "You've spent months building your MVP without validating if anyone genuinely needs it, constantly guessing whether people will ever pay for it while each rejection feels like a personal judgment on your skills and ideas. Your runway is shrinking and savings are disappearing with no clear direction, leaving you paralyzed by the pressure to choose the right next move.",
      solution: "Use BizMap AI to validate your idea with a structured 7-question framework that tests problem-solution fit before you burn months building. Get real feedback and validate demand before committing to a full build.",
      journey: [
        { label: "Build", status: "problem" as const, description: "8 months" },
        { label: "Launch", status: "struggle" as const, description: "3 signups" },
        { label: "Validate", status: "solution" as const, description: "BizMap AI" }
      ]
    },
    {
      beforeIcon: Users,
      afterIcon: CheckCircle,
      problem: "Team Building Nightmares",
      storyHook: "Alex needs a technical co-founder. The equity conversation keeps getting postponed. Every day of delay feels like a missed opportunity.",
      character: {
        name: "Alex",
        context: "Non-technical founder, needs technical co-founder",
        emotion: "anxious"
      },
      scenario: "You've found the perfect technical co-founder. They're excited. You're excited. But when it comes to equity, you both freeze. 50/50? 60/40? What about advisors?",
      struggle: "The fear of making the wrong decision paralyzes you. What if you give away too much? What if they feel undervalued? The conversation keeps getting postponed.",
      moment: "The moment you realize you're letting perfect be the enemy of good—and your startup is stuck because you can't make a decision.",
      beforeText: "Paralyzed by equity split uncertainty, unable to move forward with team building decisions.",
      afterText: "Connect with founders in our Community who've navigated equity splits and co-founder agreements.",
      detail: "You need co-founders or early team members but are paralyzed by uncertainty about fair equity splits. Should your technical co-founder get 50%? What about advisors helping with connections? The fear of making the wrong decision and creating resentment down the line keeps you stuck, unable to move forward with team building.",
      solution: "Connect with potential co-founders and advisors in our Community who've navigated these decisions. Get real advice on equity splits and co-founder agreements from founders who've been there.",
      journey: [
        { label: "Find", status: "problem" as const, description: "Co-founder" },
        { label: "Negotiate", status: "struggle" as const, description: "Equity split" },
        { label: "Connect", status: "solution" as const, description: "Community" }
      ]
    },
    {
      beforeIcon: DollarSign,
      afterIcon: CheckCircle,
      problem: "Raising Capital Feels Impossible",
      storyHook: "You've sent 50 cold emails to investors. 2 responses. Both rejections. Your runway is 3 months. The pressure is crushing.",
      character: {
        name: "Jordan",
        context: "Pre-seed founder, needs funding, 3 months runway",
        emotion: "uncertain"
      },
      scenario: "Friends and family are skeptical. Angels want traction you don't have. Pre-seed funds want a team you're still building. Every 'no' makes you question everything.",
      struggle: "You're stuck in the 'need money to get money' trap. Every rejection makes you question if your idea is even worth pursuing, creating a cycle of self-doubt that undermines your confidence and momentum.",
      moment: "The moment you realize you've been pitching to the wrong investors—wasting time on people who don't invest in your stage or space.",
      beforeText: "Stuck in the 'need money to get money' trap, wasting time pitching to the wrong investors.",
      afterText: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup.",
      detail: "You're stuck in the 'need money to get money' trap. Friends and family are skeptical, angels want traction you don't have, and pre-seed funds want a team you're still building. Every rejection makes you question if your idea is even worth pursuing, creating a cycle of self-doubt that undermines your confidence and momentum.",
      solution: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup. Get real-time data on which investors are active in your space and how to position your pitch.",
      journey: [
        { label: "Pitch", status: "problem" as const, description: "50 emails" },
        { label: "Reject", status: "struggle" as const, description: "2 responses" },
        { label: "Research", status: "solution" as const, description: "Insighta" }
      ]
    },
    {
      beforeIcon: Map,
      afterIcon: CheckCircle,
      problem: "Go-to-Market Confusion",
      storyHook: "You know you need to 'go to market' but have no idea what that actually means. B2B or B2C? Direct sales or inbound? You're paralyzed by choice.",
      character: {
        name: "Morgan",
        context: "First-time founder, unclear on GTM strategy",
        emotion: "uncertain"
      },
      scenario: "You've built something great, but who's going to buy it? Should you focus on B2B or B2C? Direct sales or inbound marketing? Every decision feels like a guess.",
      struggle: "You're paralyzed by fundamental questions with no framework to guide your choices. You're wasting time and money on channels that don't work because you don't know who your ideal customer actually is.",
      moment: "The moment you realize you've been marketing to everyone—and reaching no one.",
      beforeText: "No clear understanding of your ideal customer or which channels to focus on, wasting time and money.",
      afterText: "Build a comprehensive go-to-market strategy with BizMap AI, defining your ICP and channel selection.",
      detail: "You know you need to 'go to market' but have no clear understanding of what that means or who your ideal customer actually is, leaving you unable to make strategic decisions. You're paralyzed by fundamental questions like should you focus on B2B or B2C, or direct sales versus inbound marketing, with no framework to guide your choices.",
      solution: "Use BizMap AI to build a comprehensive go-to-market strategy tailored to your startup. Define your ideal customer profile and get step-by-step frameworks for customer discovery and channel selection.",
      journey: [
        { label: "Unclear", status: "problem" as const, description: "No strategy" },
        { label: "Paralyzed", status: "struggle" as const, description: "Too many options" },
        { label: "Clarity", status: "solution" as const, description: "BizMap AI" }
      ]
    },
    {
      beforeIcon: AlertCircle,
      afterIcon: CheckCircle,
      problem: "Weak Execution Habits",
      storyHook: "You start each week with big plans. By Wednesday, you're distracted. By Friday, you've accomplished nothing. The cycle repeats.",
      character: {
        name: "Taylor",
        context: "Solo founder, juggling multiple priorities",
        emotion: "frustrated"
      },
      scenario: "You're constantly busy—product development, customer calls, fundraising prep, marketing. But nothing feels like it's moving forward. You're spinning in circles.",
      struggle: "You get distracted by shiny new ideas instead of executing on your core priorities. You're juggling too many things at once, but nothing feels like it's moving forward despite being constantly busy.",
      moment: "The moment you realize you've been 'busy' for months but haven't shipped anything meaningful.",
      beforeText: "Getting distracted by Wednesday, juggling too many priorities with no clear execution system.",
      afterText: "Your Dashboard keeps you focused with clear priorities, progress tracking, and weekly sprint planning.",
      detail: "You start each week with big plans but get distracted by Wednesday, constantly pulled toward shiny new ideas instead of executing on your core priorities. You're juggling too many things at once including product development, customer calls, fundraising prep, and marketing, but nothing feels like it's moving forward despite being constantly busy.",
      solution: "Your Dashboard keeps you focused on what matters with clear priorities, progress tracking, and weekly sprint planning. Build execution systems that help you ship consistently instead of spinning in circles.",
      journey: [
        { label: "Plan", status: "problem" as const, description: "Big plans" },
        { label: "Distract", status: "struggle" as const, description: "By Wednesday" },
        { label: "Focus", status: "solution" as const, description: "Dashboard" }
      ]
    },
    {
      beforeIcon: Flame,
      afterIcon: CheckCircle,
      problem: "Early Burnout & Lost Momentum",
      storyHook: "Three months ago, you were on fire. Now? The excitement has faded. You're exhausted, questioning everything, and the initial spark is gone.",
      character: {
        name: "Casey",
        context: "Founder, 3 months in, losing momentum",
        emotion: "frustrated"
      },
      scenario: "Late nights, constant rejection, relentless uncertainty. The emotional weight of the startup journey is wearing you down day by day. You're questioning if you have what it takes.",
      struggle: "The initial excitement that drove you has faded, replaced by exhaustion. You're watching the fire fade as the emotional rollercoaster takes its toll.",
      moment: "The moment you realize you're burning out—and you don't know how to get your momentum back.",
      beforeText: "Initial excitement faded, replaced by exhaustion and uncertainty, questioning if you have what it takes.",
      afterText: "Connect with founders in our Community who understand the emotional rollercoaster and help maintain momentum.",
      detail: "The initial excitement that drove you three months ago has faded, replaced by exhaustion from late nights, constant rejection, and the relentless uncertainty of the startup journey. You're questioning if you have what it takes, watching the initial fire fade as the emotional weight of the rollercoaster wears you down day by day.",
      solution: "Connect with founders in our Community who understand the emotional rollercoaster and can help you maintain momentum. Get strategies for managing energy and building sustainable founder habits that prevent burnout.",
      journey: [
        { label: "Excite", status: "problem" as const, description: "3 months ago" },
        { label: "Burnout", status: "struggle" as const, description: "Exhausted" },
        { label: "Support", status: "solution" as const, description: "Community" }
      ]
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      <style>{`
        @keyframes flicker {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
          }
          25% {
            opacity: 0.8;
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
          }
          75% {
            opacity: 0.9;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.45);
          }
        }
        .animate-flicker {
          animation: flicker 2s ease-in-out infinite;
        }
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-card-entrance {
          animation: slideUpFadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .card-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }
        .icon-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover .icon-hover-effect {
          transform: scale(1.1) rotate(5deg);
        }
        .arrow-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover .arrow-hover-effect {
          transform: scale(1.15) rotate(12deg);
        }
        @keyframes storyReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .story-element {
          animation: storyReveal 0.5s ease-out forwards;
        }
        .quote-mark {
          font-family: Georgia, serif;
          font-size: 3rem;
          line-height: 1;
          opacity: 0.2;
        }
      `}</style>
      {/* Problem-Focused Wallpaper - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-red-950/30 dark:via-gray-900/20 dark:to-orange-950/20 from-red-50/40 via-background to-orange-50/30" />
      
      {/* Circuit Board Pattern - theme-aware */}
      <div className="absolute inset-0 dark:opacity-5 opacity-3">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--red-primary) / 0.1) 1px, transparent 1px),
            linear-gradient(hsl(var(--red-primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Scattered Problem Icons Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Scattered X marks representing problems */}
        <div className="absolute top-20 left-20 text-[hsl(var(--red-primary))] text-4xl font-bold">✕</div>
        <div className="absolute top-40 right-32 text-[hsl(var(--red-primary))] text-3xl font-bold">✕</div>
        <div className="absolute bottom-32 left-40 text-[hsl(var(--red-primary))] text-5xl font-bold">✕</div>
        <div className="absolute bottom-48 right-20 text-[hsl(var(--red-primary))] text-2xl font-bold">✕</div>
        <div className="absolute top-1/2 left-1/3 text-[hsl(var(--red-primary))] text-6xl font-bold">✕</div>
        <div className="absolute top-1/3 right-1/4 text-[hsl(var(--red-primary))] text-3xl font-bold">✕</div>
      </div>
      
      {/* Warning Stripes - theme-aware */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-red-500/20 via-red-400/15 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-orange-500/20 via-orange-400/15 to-transparent" />
      
      {/* Glitch Effect Elements - theme-aware */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 dark:bg-[hsl(var(--red-primary))]/30 bg-[hsl(var(--red-primary))]/20 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 dark:bg-orange-500/30 bg-orange-400/20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 mb-6 text-sm animate-flicker">
            Big Challenges, Bold Solutions
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="gradient-unified">Common Roadblocks Pre-Seed Founders Face</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every founder's journey is unique, but the challenges are universal. Read the real stories behind these roadblocks and discover how the right tools, frameworks, and community support can help you navigate them.
          </p>
        </div>

        {/* Problems Grid - 3 Column Layout with Better Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((item, index) => {
            const BeforeIcon = item.beforeIcon;
            const AfterIcon = item.afterIcon;
            const isExpanded = expandedCards.has(index);
            
            return (
              <Card 
                key={index} 
                className="card-hover-effect border-l-4 border-red-500/50 hover:border-red-500/80 border-border flex flex-col h-full relative overflow-hidden group animate-card-entrance bg-card/50 backdrop-blur-sm"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {/* Problem Section Background Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-br from-red-50/20 dark:from-red-950/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardHeader className="pb-4 p-5 relative z-10">
                  {/* Storytelling Elements */}
                  <div className="space-y-4">
                    {/* Character Introduction */}
                    {item.character && (
                      <CharacterIntro
                        name={item.character.name}
                        context={item.character.context}
                        emotion={item.character.emotion}
                        icon={User}
                      />
                    )}
                    
                    {/* Story Hook */}
                    {item.storyHook && (
                      <ScenarioHeader hook={item.storyHook} quote={true} />
                    )}
                    
                    {/* Problem Title with Emotional Indicator */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="icon-hover-effect p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
                          <BeforeIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-bold leading-tight text-red-600 dark:text-red-400 mb-2">
                            {item.problem}
                          </CardTitle>
                          {item.character && (
                            <EmotionalIndicator 
                              emotion={item.character.emotion as 'frustrated' | 'anxious' | 'uncertain' | 'hopeful' | 'confident'} 
                              intensity="medium" 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Journey Map */}
                    {item.journey && (
                      <div className="pt-2">
                        <JourneyMap milestones={item.journey} />
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Arrow Divider - More Compact */}
                <div className="relative px-5 py-3">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="arrow-hover-effect w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-green-500/20 border border-primary/30 flex items-center justify-center shadow-md backdrop-blur-sm">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-red-200 via-primary/20 to-green-200 dark:from-red-900/40 dark:via-primary/15 dark:to-green-900/40" />
                </div>

                {/* Solution Section Background Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-tl from-green-50/20 dark:from-green-950/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Solution Section */}
                <CardContent className="pt-4 pb-5 px-5 flex-1 flex flex-col relative z-10">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="icon-hover-effect p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                        <AfterIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">Solution</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {item.afterText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Section - Storytelling */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      {/* Scenario */}
                      {item.scenario && (
                        <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                          <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            The Situation:
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed italic">{item.scenario}</p>
                        </div>
                      )}
                      
                      {/* Struggle */}
                      {item.struggle && (
                        <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                          <h5 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            The Struggle:
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.struggle}</p>
                        </div>
                      )}
                      
                      {/* The Moment */}
                      {item.moment && (
                        <div className="p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                          <h5 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                            <Flame className="w-3.5 h-3.5" />
                            The Moment:
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed italic font-medium">{item.moment}</p>
                        </div>
                      )}
                      
                      {/* Solution */}
                      <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                        <h5 className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          The Solution:
                        </h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.solution}</p>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button - More Compact */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="mt-4 w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all duration-300 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary/90 active:scale-[0.98]"
                  >
                    {isExpanded ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5 transition-transform duration-300" />
                      </>
                    ) : (
                      <>
                        <span>Learn More</span>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;

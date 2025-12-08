import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  CheckCircle,
  RotateCcw
} from "lucide-react";

const EntrepreneurProblems = () => {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const toggleFlip = (index: number) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFlip(index);
    }
  };

  const problems = [
    {
      icon: Search,
      problem: "Building Without Validating",
      detail: "You've spent months building your MVP without validating if anyone genuinely needs it, constantly guessing whether people will ever pay for it while each rejection feels like a personal judgment on your skills and ideas. Your runway is shrinking and savings are disappearing with no clear direction, leaving you paralyzed by the pressure to choose the right next move. The fear of building something nobody wants keeps you awake at night, questioning every feature decision and wondering if you're wasting precious time and resources on a product that might never find its market. This validation paralysis creates a dangerous cycle where you keep building in isolation, hoping that the next feature will finally make people care, but deep down you know you're avoiding the hard conversations that would tell you the truth about your idea's viability.",
      solution: "Creatives Takeover provides BizMap AI, a powerful validation framework that helps you test problem-solution fit before you burn months building. Our structured 7-question framework guides you through real customer discovery, helping you understand genuine market demand and validate your core assumptions with actual potential customers. Instead of guessing in isolation, you'll get actionable feedback that tells you exactly what resonates and what doesn't, allowing you to pivot early or double down with confidence. The platform connects you with a community of founders who've navigated this exact challenge, sharing their validation strategies and helping you avoid the costly mistake of building something nobody wants. With BizMap AI, you'll know whether your idea has legs before you've invested everything into it, giving you the clarity and confidence to make informed decisions about your startup's future.",
    },
    {
      icon: Users,
      problem: "Team Building Nightmares",
      detail: "You need co-founders or early team members but are paralyzed by uncertainty about fair equity splits. Should your technical co-founder get 50%? What about advisors helping with connections? The fear of making the wrong decision and creating resentment down the line keeps you stuck, unable to move forward with team building. Every conversation about equity feels like a negotiation that could destroy relationships before they even begin, and you're constantly second-guessing whether you're being too generous or too stingy. The lack of clear frameworks and real-world examples makes every decision feel like a gamble, and you're terrified that a bad equity split will haunt your startup for years to come, potentially destroying the very team you're trying to build.",
      solution: "Creatives Takeover's Community connects you with founders who've successfully navigated equity splits and co-founder agreements, providing real-world examples and battle-tested frameworks that remove the guesswork from team building. Our platform offers access to proven equity split calculators and co-founder agreement templates that have been used by hundreds of successful startups, giving you confidence in your decisions. You'll learn from founders who've made these choices before, understanding what works and what creates problems down the line. The community provides a safe space to discuss your specific situation and get honest feedback from experienced entrepreneurs who understand the nuances of early-stage team building. With Creatives Takeover, you'll build your team with clarity and fairness, avoiding the common pitfalls that derail so many promising startups before they even get started.",
    },
    {
      icon: DollarSign,
      problem: "Raising Capital Feels Impossible",
      detail: "You're stuck in the 'need money to get money' trap. Friends and family are skeptical, angels want traction you don't have, and pre-seed funds want a team you're still building. Every rejection makes you question if your idea is even worth pursuing, creating a cycle of self-doubt that undermines your confidence and momentum. You're spending countless hours researching investors and crafting pitches, but you're shooting in the dark, not knowing which investors actually invest in your space or what they're really looking for. The fundraising process feels like a black box where you're constantly guessing what investors want, wasting time on pitches that were never going to work, and each rejection chips away at your belief that you can actually make this happen.",
      solution: "Creatives Takeover's Insighta platform transforms fundraising from guesswork into a strategic process. Our investor research tools help you understand each investor's thesis, track record, and active investment patterns, allowing you to identify the perfect fit for your startup before you even write your first email. You'll get real-time data on which investors are actively investing in your space, what stage they prefer, and how to position your pitch to resonate with their specific interests. The platform provides access to successful pitch decks and fundraising strategies from founders who've raised pre-seed rounds, giving you proven frameworks that actually work. With Insighta, you'll stop wasting time on the wrong investors and start having meaningful conversations with the right ones, dramatically increasing your chances of closing that crucial first round of funding.",
    },
    {
      icon: Map,
      problem: "Go-to-Market Confusion",
      detail: "You know you need to 'go to market' but have no clear understanding of what that means or who your ideal customer actually is, leaving you unable to make strategic decisions. You're paralyzed by fundamental questions like should you focus on B2B or B2C, or direct sales versus inbound marketing, with no framework to guide your choices. Every marketing channel seems equally valid and equally expensive, and you're throwing money at tactics without understanding which ones will actually work for your specific product and market. The lack of a clear go-to-market strategy means you're constantly second-guessing your approach, unable to commit fully to any channel because you're not confident it's the right one, resulting in mediocre results across the board.",
      solution: "Creatives Takeover's BizMap AI helps you build a comprehensive go-to-market strategy tailored specifically to your startup's unique situation. Our platform guides you through defining your ideal customer profile with precision, using proven frameworks that help you understand exactly who needs your product and why they'll pay for it. You'll get step-by-step guidance on customer discovery, channel selection, and market positioning, with real examples from successful startups that have navigated similar challenges. The platform provides access to go-to-market templates and playbooks that have been battle-tested by hundreds of founders, giving you confidence in your strategic decisions. With BizMap AI, you'll move from confusion to clarity, building a go-to-market strategy that actually works for your specific product and market, allowing you to focus your time and resources on the channels that will drive real growth.",
    },
    {
      icon: AlertCircle,
      problem: "Weak Execution Habits",
      detail: "You start each week with big plans but get distracted by Wednesday, constantly pulled toward shiny new ideas instead of executing on your core priorities. You're juggling too many things at once including product development, customer calls, fundraising prep, and marketing, but nothing feels like it's moving forward despite being constantly busy. The lack of a clear execution system means you're constantly context-switching, losing momentum on important projects, and never quite finishing anything completely. You know what needs to be done, but without a structured approach to prioritization and execution, you find yourself spinning in circles, making progress on everything but completing nothing, which leaves you feeling exhausted and unproductive despite working long hours.",
      solution: "Creatives Takeover's Dashboard provides the execution system you've been missing, keeping you focused on what actually matters with clear priorities, progress tracking, and weekly sprint planning. Our platform helps you break down your big goals into actionable weekly sprints, giving you a clear roadmap for what to focus on and when. The Dashboard tracks your progress across all your key initiatives, showing you exactly where you're making real progress and where you're getting stuck, allowing you to course-correct before you waste weeks on the wrong priorities. You'll build execution habits that help you ship consistently instead of spinning in circles, with accountability systems and progress tracking that keep you honest about what you're actually accomplishing. With the Dashboard, you'll transform from someone who's constantly busy to someone who's consistently productive, building the execution muscle that separates successful founders from those who burn out.",
    },
    {
      icon: Flame,
      problem: "Early Burnout & Lost Momentum",
      detail: "The initial excitement that drove you three months ago has faded, replaced by exhaustion from late nights, constant rejection, and the relentless uncertainty of the startup journey. You're questioning if you have what it takes, watching the initial fire fade as the emotional weight of the rollercoaster wears you down day by day. The isolation of being a solo founder or small team means you're carrying all the stress alone, with no one who truly understands what you're going through. Every setback feels personal, every rejection feels like a judgment on your worth, and the constant pressure to perform is draining your energy and enthusiasm. You're starting to wonder if this is sustainable, if you can keep going, and whether the emotional toll is worth the potential reward.",
      solution: "Creatives Takeover's Community provides the support system that prevents burnout and maintains momentum through the toughest parts of the founder journey. Our platform connects you with founders who understand the emotional rollercoaster you're experiencing, creating a space where you can be honest about the challenges without judgment. You'll get strategies for managing energy and building sustainable founder habits from people who've navigated the same emotional challenges, learning how to maintain your fire without burning out. The community offers accountability partnerships, weekly check-ins, and peer support that helps you stay motivated even when things get tough. With Creatives Takeover, you'll build the resilience and sustainable habits that allow you to maintain momentum through the inevitable ups and downs, transforming the lonely startup journey into a shared experience with people who genuinely understand and support your mission.",
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden" aria-labelledby="roadblocks-heading">
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
        .animate-card-entrance {
          animation: slideUpFadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .flip-card {
          perspective: 1000px;
          height: 100%;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        @media (hover: hover) and (pointer: fine) {
          .flip-card:hover:not(.flipped) .flip-card-inner {
            transform: rotateY(180deg);
          }
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
          <h2 id="roadblocks-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="gradient-unified">Common Roadblocks Pre-Seed Founders Face</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover how the right tools, frameworks, and community support help you navigate these obstacles and build with confidence.
          </p>
        </div>

        {/* Flip Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((item, index) => {
            const Icon = item.icon;
            const isFlipped = flippedCards.has(index);
            
            return (
              <article
                key={index}
                className={`flip-card animate-card-entrance ${isFlipped ? 'flipped' : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div
                  className="flip-card-inner"
                  onClick={() => toggleFlip(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.problem} - Click or hover to flip and see solution`}
                  aria-pressed={isFlipped}
                  aria-expanded={isFlipped}
                >
                  {/* Front Side - Problem (Red) */}
                  <div className="flip-card-front bg-card/50 backdrop-blur-sm border-2 border-red-500/50 hover:border-red-500/80 rounded-lg p-6 flex flex-col h-full min-h-[400px] focus-within:ring-2 focus-within:ring-red-500/50 focus-within:ring-offset-2 transition-all duration-300">
                    <div className="bg-red-500/10 rounded-lg p-4 mb-4 border border-red-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex-shrink-0">
                          <Icon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
                          {item.problem}
                        </h3>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-red-500/20 flex items-center justify-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <span>Hover or click to see solution</span>
                        <RotateCcw className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Back Side - Solution (Green) */}
                  <div className="flip-card-back bg-card/50 backdrop-blur-sm border-2 border-green-500/50 hover:border-green-500/80 rounded-lg p-6 flex flex-col h-full min-h-[400px] focus-within:ring-2 focus-within:ring-green-500/50 focus-within:ring-offset-2 transition-all duration-300">
                    <div className="bg-green-500/10 rounded-lg p-4 mb-4 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
                          Creatives Takeover Solution
                        </h3>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.solution}
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-green-500/20 flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <span>Hover or click to see problem</span>
                        <RotateCcw className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;

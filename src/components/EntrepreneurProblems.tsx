import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const EntrepreneurProblems = () => {
  const problems = [
    {
      icon: <Search className="w-8 h-8 text-red-500" />,
      problem: "Building Without Validating Problem-Solution Fit",
      description: [
        "Spent months building MVP without validating if anyone genuinely needs it",
        "Constantly guessing whether people will ever pay for it",
        "Each 'no' feels like a personal judgment on your skills and ideas",
        "Runway shrinking and savings disappearing with no clear direction",
        "No clear data to guide pivots or next moves"
      ],
      solution: "Use BizMap AI to validate your idea with a structured 7-question framework that tests problem-solution fit before you burn months building. Get real feedback and validate demand before committing to a full build.",
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      problem: "Team Building and Equity Division Nightmares",
      description: [
        "Need co-founders or early team members but unsure how to proceed",
        "Uncertain about fair equity splits (should technical co-founder get 50%?)",
        "Confused about advisor equity for connections and help",
        "Paralyzed by fear of making the wrong decision",
        "Worried about creating resentment down the line"
      ],
      solution: "Connect with potential co-founders and advisors in our Community who've navigated these decisions. Get real advice on equity splits and co-founder agreements from founders who've been there."
    },
    {
      icon: <DollarSign className="w-8 h-8 text-red-500" />,
      problem: "Raising Your First Capital Feels Impossible",
      description: [
        "Friends and family are skeptical about your idea",
        "Angels want traction you don't have yet",
        "Pre-seed funds want a team you're still building",
        "Stuck in the 'need money to get money' trap",
        "Every rejection makes you question if your idea is worth pursuing"
      ],
      solution: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup. Get real-time data on which investors are active in your space and how to position your pitch."
    },
    {
      icon: <Map className="w-8 h-8 text-red-500" />,
      problem: "Go-to-Market Strategy Confusion and Unclear ICP",
      description: [
        "Know you need to 'go to market' but unclear what that actually means",
        "Don't know who your ideal customer is",
        "Unsure whether to focus on B2B or B2C",
        "Confused about direct sales vs inbound marketing",
        "Wasting time and money on channels that don't convert"
      ],
      solution: "Use BizMap AI to build a comprehensive go-to-market strategy tailored to your startup. Define your ideal customer profile and get step-by-step frameworks for customer discovery and channel selection."
    },
    {
      icon: <AlertCircle className="w-8 h-8 text-red-500" />,
      problem: "Weak Execution Habits and Lack of Focus",
      description: [
        "Start each week with big plans but get distracted by Wednesday",
        "Constantly distracted by shiny new ideas",
        "Juggling too many things at once (product, calls, fundraising, marketing)",
        "Nothing feels like it's moving forward",
        "Busy but not productive"
      ],
      solution: "Your Dashboard keeps you focused on what matters with clear priorities, progress tracking, and weekly sprint planning. Build execution systems that help you ship consistently instead of spinning in circles."
    },
    {
      icon: <Flame className="w-8 h-8 text-red-500" />,
      problem: "Early Burnout and Losing Momentum",
      description: [
        "Initial excitement has faded after three months",
        "Exhausted from late nights, constant rejection, and uncertainty",
        "Questioning if you have what it takes",
        "The initial fire is starting to fade",
        "Need to find a sustainable pace but don't know how"
      ],
      solution: "Connect with founders in our Community who understand the emotional rollercoaster and can help you maintain momentum. Get strategies for managing energy and building sustainable founder habits that prevent burnout."
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Problem-Focused Dark Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-gray-900/20 to-orange-950/20" />
      
      {/* Circuit Board Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Scattered Problem Icons Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Scattered X marks representing problems */}
        <div className="absolute top-20 left-20 text-red-500 text-4xl font-bold">✕</div>
        <div className="absolute top-40 right-32 text-red-500 text-3xl font-bold">✕</div>
        <div className="absolute bottom-32 left-40 text-red-500 text-5xl font-bold">✕</div>
        <div className="absolute bottom-48 right-20 text-red-500 text-2xl font-bold">✕</div>
        <div className="absolute top-1/2 left-1/3 text-red-500 text-6xl font-bold">✕</div>
        <div className="absolute top-1/3 right-1/4 text-red-500 text-3xl font-bold">✕</div>
      </div>
      
      {/* Warning Stripes */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      
      {/* Glitch Effect Elements */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 bg-red-500/30 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 bg-orange-500/30 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Don't Repeat the Same Mistakes
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Why Most Pre-Seed Founders <span className="text-red-500">Fail</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Most pre-seed founders fail because they're overwhelmed by complexity, not because their idea is bad. You're juggling validation, team building, fundraising, and product-market fit all at once, with limited resources and no playbook. Here's what actually kills pre-seed startups, and how to avoid it.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 px-4">
          {problems.map((item, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 text-red-500">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-red-600">{item.problem}</h3>
                    <ul className="text-sm sm:text-base text-muted-foreground mb-4 list-disc list-inside space-y-1">
                      {item.description.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Solution */}
                <div className="border-t border-border/50 pt-4 sm:pt-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">Our Solution:</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;

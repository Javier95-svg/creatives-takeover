import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Lightbulb, 
  FlaskConical, 
  TrendingUp, 
  Users, 
  Info,
  DollarSign,
  Target,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformSnippet {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: 'planning' | 'action' | 'growth';
}

const platformSnippets: PlatformSnippet[] = [
  {
    name: "Business Planning",
    description: "7-step wizard to build your 30-day launch plan",
    icon: Target,
    route: "/bizmap-ai",
    color: "planning"
  },
  {
    name: "Dashboard",
    description: "Market Validation, Task Calendar, Revenue Hub",
    icon: LayoutDashboard,
    route: "/dashboard",
    color: "action"
  },
  {
    name: "BizMap AI Chat",
    description: "AI-powered conversational business planning",
    icon: MessageSquare,
    route: "/bizmap-ai",
    color: "growth"
  },
  {
    name: "Funding Opportunities",
    description: "Find grants, accelerators, contests, and microfunds",
    icon: DollarSign,
    route: "/blog",
    color: "planning"
  },
  {
    name: "Product Market Fit Lab",
    description: "Validate your product in the market",
    icon: FlaskConical,
    route: "/bizmap-ai",
    color: "action"
  },
  {
    name: "Prompt Library",
    description: "Pre-built AI prompts for pitches, emails, interviews",
    icon: Lightbulb,
    route: "/prompt-library",
    color: "growth"
  },
  {
    name: "Insighta",
    description: "Curated news hub for funding and AI trends",
    icon: TrendingUp,
    route: "/insighta",
    color: "planning"
  },
  {
    name: "Community",
    description: "Connect with founders, get feedback, demo days",
    icon: Users,
    route: "/community",
    color: "action"
  }
];

const HeroSnippets = () => {
  // Duplicate snippets to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets];

  const getColorClasses = (color: 'planning' | 'action' | 'growth') => {
    const colorMap = {
      planning: {
        glass: 'glass-blue',
        border: 'border-planning/30 hover:border-planning/60',
        shadow: 'hover:shadow-lg hover:shadow-blue/20',
        icon: 'text-planning'
      },
      action: {
        glass: 'glass-red',
        border: 'border-action/30 hover:border-action/60',
        shadow: 'hover:shadow-lg hover:shadow-red/20',
        icon: 'text-action'
      },
      growth: {
        glass: 'glass-green',
        border: 'border-growth/30 hover:border-growth/60',
        shadow: 'hover:shadow-lg hover:shadow-green/20',
        icon: 'text-growth'
      }
    };
    return colorMap[color];
  };

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Auto-Scrolling Container with CSS Animation */}
      <div className="relative overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
        <style>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-50% - 1rem));
            }
          }
          .auto-scroll {
            animation: scroll 60s linear infinite;
          }
          .auto-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div 
          className="flex gap-4 sm:gap-6 lg:gap-8 auto-scroll"
          style={{ width: 'max-content' }}
        >
          {duplicatedSnippets.map((snippet, index) => {
            const Icon = snippet.icon;
            const colors = getColorClasses(snippet.color);
            
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
                className={cn(
                  "btn-magnetic flex-shrink-0 w-[280px] sm:w-[300px]",
                  "h-[200px] sm:h-[220px]",
                  "p-4 sm:p-6 bg-card border-2 transition-all duration-300",
                  "flex flex-col items-center justify-center text-center",
                  colors.glass,
                  colors.border,
                  colors.shadow
                )}
              >
                <div className="flex justify-center mb-3">
                  <Icon className={cn("w-6 sm:w-8 h-6 sm:h-8", colors.icon)} />
                </div>
                <div className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  {snippet.name}
                </div>
                <div className="text-muted-foreground text-xs sm:text-sm">
                  {snippet.description}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

